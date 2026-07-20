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

interface AccountSuspendedEmailProps {
  username: string;
  reason: string;
  durationText: string;
  suspendedUntilDate: string;
}

export default function AccountSuspendedEmail({
  username,
  reason,
  durationText,
  suspendedUntilDate,
}: AccountSuspendedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Account Suspension Notice - Veil</Preview>
      <Section style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={header}>VEIL</Heading>

          {/* Badge */}
          <Section style={badgeContainer}>
            <Text style={badgeText}>ACCOUNT SUSPENDED</Text>
          </Section>

          {/* Body */}
          <Text style={headingText}>Hello @{username},</Text>

          <Text style={bodyText}>
            Your Veil account has been temporarily suspended due to a violation of our community safety guidelines.
          </Text>

          {/* Details Box */}
          <Section style={detailsCard}>
            <Text style={detailsTitle}>SUSPENSION DETAILS</Text>
            <Hr style={divider} />
            <Text style={detailRow}>
              <strong>Reason:</strong> &ldquo;{reason}&rdquo;
            </Text>
            <Text style={detailRow}>
              <strong>Duration:</strong> {durationText}
            </Text>
            <Text style={detailRow}>
              <strong>Suspended Until:</strong> {suspendedUntilDate}
            </Text>
          </Section>

          <Text style={bodyText}>
            During this period, you will not be able to log in, send, or receive messages. Access will be automatically restored once your suspension expires.
          </Text>

          <Text style={subText}>
            Repeated violations will result in escalating suspension durations or a permanent ban from the platform.
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
  backgroundColor: "rgba(245, 158, 11, 0.15)",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  borderRadius: "8px",
  padding: "8px 16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const badgeText = {
  color: "#f59e0b",
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

const subText = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "16px 0",
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
