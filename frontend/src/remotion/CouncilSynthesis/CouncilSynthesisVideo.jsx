import { AbsoluteFill, Sequence } from "remotion";
import IntroScene from "./scenes/IntroScene";
import BudgetScene from "./scenes/BudgetScene";
import SavingsScene from "./scenes/SavingScene";
import DebtScene from "./scenes/DebtScene";
import InvestmentScene from "./scenes/InvestmentScene";
import ActionPlanScene from "./scenes/ActionPlanScene";
import {
  DARK_COLORS,
  SCENE_DURATIONS,
  SCENE_OFFSETS,
} from "./constants";

function CouncilSynthesisVideo({ data, colors = DARK_COLORS }) {
  const videoData = data?.videoBriefing || data;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <Sequence
        from={SCENE_OFFSETS.intro}
        durationInFrames={SCENE_DURATIONS.intro}
        name="Intro"
      >
        <IntroScene data={videoData?.intro} colors={colors} />
      </Sequence>

      <Sequence
        from={SCENE_OFFSETS.budget}
        durationInFrames={SCENE_DURATIONS.budget}
        name="Budget"
      >
        <BudgetScene data={videoData?.budget} colors={colors} />
      </Sequence>

      <Sequence
        from={SCENE_OFFSETS.savings}
        durationInFrames={SCENE_DURATIONS.savings}
        name="Savings"
      >
        <SavingsScene data={videoData?.savings} colors={colors} />
      </Sequence>

      <Sequence
        from={SCENE_OFFSETS.debt}
        durationInFrames={SCENE_DURATIONS.debt}
        name="Debt"
      >
        <DebtScene data={videoData?.debt} colors={colors} />
      </Sequence>

      <Sequence
        from={SCENE_OFFSETS.investment}
        durationInFrames={SCENE_DURATIONS.investment}
        name="Investment"
      >
        <InvestmentScene data={videoData?.investment} colors={colors} />
      </Sequence>

      <Sequence
        from={SCENE_OFFSETS.actionPlan}
        durationInFrames={SCENE_DURATIONS.actionPlan}
        name="ActionPlan"
      >
        <ActionPlanScene data={videoData?.actionPlan} colors={colors} />
      </Sequence>
    </AbsoluteFill>
  );
}

export default CouncilSynthesisVideo;