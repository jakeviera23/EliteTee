import { useState } from "react";
import { Alert, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlockMemberModal } from "@/components/safety/BlockMemberModal";
import { ReportContentModal } from "@/components/safety/ReportContentModal";
import { colors, radii } from "@/constants/theme";
import {
  isReportableTargetId,
  type ContentReportTargetType,
} from "@/lib/contentReports";

type SafetyOverflowMenuProps = {
  reportTargetType: ContentReportTargetType;
  reportTargetId: string;
  /** e.g. "post", "comment", "member" — used for menu copy. */
  reportNoun: string;
  /** When set, a "Block member" option is offered. */
  blockUserId?: string | null;
  blockName?: string;
  onBlocked?: () => void;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * Overflow (⋯) button that opens a native action list with Report / Block,
 * then the matching report or block confirmation modal.
 */
export function SafetyOverflowMenu({
  reportTargetType,
  reportTargetId,
  reportNoun,
  blockUserId,
  blockName,
  onBlocked,
  size = 20,
  style,
  accessibilityLabel = "More options",
}: SafetyOverflowMenuProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const canReport = isReportableTargetId(reportTargetId);
  const canBlock = Boolean(blockUserId?.trim());

  if (!canReport && !canBlock) return null;

  function openMenu() {
    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [];
    if (canReport) {
      buttons.push({ text: `Report ${reportNoun}`, onPress: () => setReportOpen(true) });
    }
    if (canBlock) {
      buttons.push({
        text: "Block member",
        style: "destructive",
        onPress: () => setBlockOpen(true),
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Safety options", undefined, buttons);
  }

  return (
    <>
      <Pressable
        onPress={openMenu}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null, style]}
      >
        <Ionicons name="ellipsis-horizontal" size={size} color={colors.textTertiary} />
      </Pressable>

      {reportOpen ? (
        <ReportContentModal
          visible
          targetType={reportTargetType}
          targetId={reportTargetId}
          targetLabel={`this ${reportNoun}`}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      {blockOpen && blockUserId ? (
        <BlockMemberModal
          visible
          memberUserId={blockUserId}
          memberName={blockName}
          onClose={() => setBlockOpen(false)}
          onBlocked={onBlocked}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
