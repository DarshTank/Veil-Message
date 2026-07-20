import {
  Html,
  Head,
  Preview,
  Heading,
  Section,
  Text,
  Container,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface AccountBannedEmailProps {
  username: string;
  reason: string;
}

export default function AccountBannedEmail({
  username,
  reason,
}: AccountBannedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Account Permanently Banned Notice - Veil</Preview>
      <Section style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={header}>VEIL</Heading>

          {/* Badge */}
          <Section style={badgeContainer}>
            <Text style={badgeText}>PERMANENTLY BANNED</Text>
          </Section>

          {/* Body */}
          <Text style={headingText}>Hello @{username},</Text>

          <Text style={bodyText}>
            Your Veil account has been <strong>permanently banned</strong> due to severe or repeated violations of our platform policy.
          </Text>

          {/* Details Box */}
          <Section style={detailsCard}>
            <Text style={detailsTitle}>BAN DETAILS</Text>
            <Hr style={divider} />
            <Text style={detailRow}>
              <strong>Reason:</strong> &ldquo;{reason}&rdquo;
            </Text>
            <Text style={detailRow}>
              <strong>Status:</strong> Permanently Terminated
            </Text>
          </Section>

          <Text style={bodyText}>
            You will no longer be able to log in, access your messages, or use any services associated with this account.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            © {new Date().getFullYear()} Veil • Anonymous Messaging & Protection
          </Text>
        </Container>
      </Section>
    </Html>
  );
}

// Inline styles for high email client compatibility
const main = {
  backgroundColor: "#09090b",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "40px 10px",
};

const container = {
  backgroundColor: "#121217",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  padding: "32px",
  maxWidth: "520px",
  margin: "0 auto",
};

const header = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "800",
  letterSpacing: "3px",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const badgeContainer = {
  backgroundColor: "rgba(239, 68, 68, 0.15)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "8px",
  padding: "8px 16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const badgeText = {
  color: "#ef4444",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "1.5px",
  margin: "0",
};

const headingText = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 12px 0",
};

const bodyText = {
  color: "#a1a1aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px 0",
};

const detailsCard = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "12px",
  padding: "16px",
  margin: "20px 0",
};

const detailsTitle = {
  color: "#d4d4d8",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1px",
  margin: "0 0 8px 0",
};

const detailRow = {
  color: "#e4e4e7",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "4px 0",
};

const divider = {
  borderColor: "rgba(255, 255, 255, 0.1)",
  margin: "16px 0",
};

const footer = {
  color: "#52525b",
  fontSize: "11px",
  textAlign: "center" as const,
  margin: "0",
};
