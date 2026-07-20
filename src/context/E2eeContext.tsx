"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  derivePinKey,
  generateRSAKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  importPublicKey,
  importPrivateKey,
  generateAESRoomKey,
  encryptRoomKey,
  decryptRoomKey,
  encryptMessage,
  decryptMessage,
  EncryptedPayload,
} from "@/helpers/clientCrypto";

export type E2eeStatus = "loading" | "setup_needed" | "unlock_needed" | "ready";

interface IChatRoomKey {
  userId: string;
  encryptedKey: string;
}

interface E2eeContextType {
  e2eeStatus: E2eeStatus;
  publicKey: string | null;
  setupE2ee: (pin: string) => Promise<boolean>;
  unlockE2ee: (pin: string) => Promise<boolean>;
  resetE2eeKeys: () => Promise<void>;
  encryptMessageContent: (roomId: string, text: string, customKey?: CryptoKey) => Promise<EncryptedPayload>;
  decryptMessageContent: (roomId: string, ciphertext: string, iv: string, customKey?: CryptoKey) => Promise<string>;
  getOrDecryptRoomKey: (roomId: string, roomKeys: IChatRoomKey[]) => Promise<CryptoKey | null>;
  setupRoomKey: (roomId: string, partnerId: string, partnerPublicKey: string) => Promise<CryptoKey | null>;
}

const E2eeContext = createContext<E2eeContextType | undefined>(undefined);

export function E2eeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [e2eeStatus, setE2eeStatus] = useState<E2eeStatus>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [roomKeysCache, setRoomKeysCache] = useState<Record<string, CryptoKey>>({});
  const roomKeysCacheRef = useRef<Record<string, CryptoKey>>({});

  // Synchronize ref cache with state cache
  useEffect(() => {
    roomKeysCacheRef.current = roomKeysCache;
  }, [roomKeysCache]);

  const userId = session?.user?._id;
  const username = session?.user?.username;

  // Load key from localStorage or fetch status from server
  const initE2ee = useCallback(async () => {
    if (!userId || !username) {
      setE2eeStatus("loading");
      return;
    }

    try {
      // 1. Check if private key already exists in local storage
      const storedPrivKeyJwk = localStorage.getItem(`veil_priv_key_${userId}`);
      const storedPubKeyJwk = localStorage.getItem(`veil_pub_key_${userId}`);

      if (storedPrivKeyJwk && storedPubKeyJwk) {
        const privKey = await importPrivateKey(storedPrivKeyJwk);
        setPrivateKey(privKey);
        setPublicKey(storedPubKeyJwk);
        setE2eeStatus("ready");
        return;
      }

      // 2. If not in local storage, check server for registered public key
      const res = await axios.get("/api/user/e2ee-key");
      if (res.data.success && res.data.publicKey) {
        setPublicKey(res.data.publicKey);
        setE2eeStatus("unlock_needed");
      } else {
        setE2eeStatus("setup_needed");
      }
    } catch (error) {
      console.warn("Error initializing E2EE:", error);
      setE2eeStatus("setup_needed");
    }
  }, [userId, username]);

  useEffect(() => {
    if (status === "authenticated") {
      initE2ee();
    } else if (status === "unauthenticated") {
      // Clear keys from memory on logout
      setPrivateKey(null);
      setPublicKey(null);
      setRoomKeysCache({});
      setE2eeStatus("loading");
    }
  }, [status, initE2ee]);

  // Generate E2EE Keys & Encrypt private key with derived PIN key
  const setupE2ee = async (pin: string): Promise<boolean> => {
    if (!userId || !username) return false;
    try {
      // 1. Generate key pair
      const { publicKeyJwk, privateKey: privKey } = await generateRSAKeyPair();
      
      // 2. Derive PIN key
      const pinKey = await derivePinKey(pin, username);

      // 3. Encrypt private key
      const { ciphertext, iv } = await encryptPrivateKey(privKey, pinKey);
      const encryptedPrivateKeyStr = JSON.stringify({ ciphertext, iv });

      // 4. Save to server
      const res = await axios.post("/api/user/e2ee-key", {
        publicKey: publicKeyJwk,
        encryptedPrivateKey: encryptedPrivateKeyStr,
      });

      if (res.data.success) {
        // Save private key JWK in local storage for session permanence
        const privJwk = await window.crypto.subtle.exportKey("jwk", privKey);
        localStorage.setItem(`veil_priv_key_${userId}`, JSON.stringify(privJwk));
        localStorage.setItem(`veil_pub_key_${userId}`, publicKeyJwk);

        setPrivateKey(privKey);
        setPublicKey(publicKeyJwk);
        setE2eeStatus("ready");
        
        toast({
          title: "E2EE Setup Complete",
          description: "Your direct messages are now end-to-end encrypted.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("E2EE Setup error:", error);
      toast({
        title: "Setup Failed",
        description: "An error occurred during E2EE setup.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Fetch encrypted private key from server, decrypt with PIN
  const unlockE2ee = async (pin: string): Promise<boolean> => {
    if (!userId || !username) return false;
    try {
      const res = await axios.get("/api/user/e2ee-key");
      if (!res.data.success || !res.data.encryptedPrivateKey) {
        setE2eeStatus("setup_needed");
        return false;
      }

      const { ciphertext, iv } = JSON.parse(res.data.encryptedPrivateKey);

      // Derive key from PIN
      const pinKey = await derivePinKey(pin, username);

      // Decrypt private key
      const decryptedPrivKey = await decryptPrivateKey(ciphertext, iv, pinKey);

      // Save to localStorage
      const privJwk = await window.crypto.subtle.exportKey("jwk", decryptedPrivKey);
      localStorage.setItem(`veil_priv_key_${userId}`, JSON.stringify(privJwk));
      localStorage.setItem(`veil_pub_key_${userId}`, res.data.publicKey);

      setPrivateKey(decryptedPrivKey);
      setPublicKey(res.data.publicKey);
      setE2eeStatus("ready");

      toast({
        title: "Chats Unlocked",
        description: "Your message decryption key is loaded.",
      });
      return true;
    } catch (error) {
      console.error("E2EE Unlock error:", error);
      toast({
        title: "Incorrect PIN",
        description: "Failed to decrypt keys. Please check your PIN.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Reset E2EE keys (requires generating new keys)
  const resetE2eeKeys = async () => {
    if (!userId) return;
    try {
      localStorage.removeItem(`veil_priv_key_${userId}`);
      localStorage.removeItem(`veil_pub_key_${userId}`);
      setPrivateKey(null);
      setPublicKey(null);
      setRoomKeysCache({});
      setE2eeStatus("setup_needed");
    } catch (error) {
      console.error("Reset E2EE error:", error);
    }
  };

  // Decrypt Room AES key and cache it
  const getOrDecryptRoomKey = async (
    roomId: string,
    roomKeys: IChatRoomKey[]
  ): Promise<CryptoKey | null> => {
    if (roomKeysCache[roomId]) {
      return roomKeysCache[roomId];
    }
    if (roomKeysCacheRef.current[roomId]) {
      return roomKeysCacheRef.current[roomId];
    }

    if (!privateKey || !userId) {
      return null;
    }

    const myEncryptedKeyObj = roomKeys.find(
      (k) => k.userId.toString() === userId.toString()
    );

    if (!myEncryptedKeyObj) {
      return null;
    }

    try {
      const aesKey = await decryptRoomKey(myEncryptedKeyObj.encryptedKey, privateKey);
      roomKeysCacheRef.current[roomId] = aesKey;
      setRoomKeysCache((prev) => ({ ...prev, [roomId]: aesKey }));
      return aesKey;
    } catch (error) {
      console.error("Room key decryption failed:", error);
      return null;
    }
  };

  // Generate, encrypt, and store a room AES key
  const setupRoomKey = async (
    roomId: string,
    partnerId: string,
    partnerPublicKey: string
  ): Promise<CryptoKey | null> => {
    if (!publicKey || !userId || !roomId || !partnerId || !partnerPublicKey) {
      console.warn("setupRoomKey aborted: missing required user or partner keys/IDs.");
      return null;
    }

    try {
      const aesKey = await generateAESRoomKey();

      // Encrypt for self (current user)
      const myRsaPublicKey = await importPublicKey(publicKey);
      const myEncryptedKey = await encryptRoomKey(aesKey, myRsaPublicKey);

      // Encrypt for partner
      const partnerRsaPublicKey = await importPublicKey(partnerPublicKey);
      const partnerEncryptedKey = await encryptRoomKey(aesKey, partnerRsaPublicKey);

      // Save to server
      const keysPayload = {
        [userId]: myEncryptedKey,
        [partnerId]: partnerEncryptedKey,
      };

      const res = await axios.post(`/api/chat/${roomId}/keys`, { keys: keysPayload });
      if (res.data.success) {
        roomKeysCacheRef.current[roomId] = aesKey;
        setRoomKeysCache((prev) => ({ ...prev, [roomId]: aesKey }));
        return aesKey;
      }
      return null;
    } catch (error) {
      console.error("Setup Room Key error:", error);
      return null;
    }
  };

  // Helper to encrypt message text
  const encryptMessageContent = async (
    roomId: string,
    text: string,
    customKey?: CryptoKey
  ): Promise<EncryptedPayload> => {
    const aesKey = customKey || roomKeysCache[roomId] || roomKeysCacheRef.current[roomId];
    if (!aesKey) {
      throw new Error("Encryption key not ready for this room.");
    }
    return await encryptMessage(aesKey, text);
  };

  // Helper to decrypt message text
  const decryptMessageContent = async (
    roomId: string,
    ciphertext: string,
    iv: string,
    customKey?: CryptoKey
  ): Promise<string> => {
    const aesKey = customKey || roomKeysCache[roomId] || roomKeysCacheRef.current[roomId];
    if (!aesKey) {
      console.warn(`Decryption key not ready yet for room: ${roomId}`);
      return "";
    }
    try {
      return await decryptMessage(aesKey, ciphertext, iv);
    } catch (err) {
      console.warn(`Failed to decrypt message for room ${roomId}:`, err);
      return "";
    }
  };

  return (
    <E2eeContext.Provider
      value={{
        e2eeStatus,
        publicKey,
        setupE2ee,
        unlockE2ee,
        resetE2eeKeys,
        encryptMessageContent,
        decryptMessageContent,
        getOrDecryptRoomKey,
        setupRoomKey,
      }}
    >
      {children}
    </E2eeContext.Provider>
  );
}

export function useE2ee() {
  const context = useContext(E2eeContext);
  if (context === undefined) {
    throw new Error("useE2ee must be used within an E2eeProvider");
  }
  return context;
}
