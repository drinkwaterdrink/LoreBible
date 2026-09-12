import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { DivergenceStage } from "../../src/components/DivergenceStage";

const take = {
  id: "take-1",
  title: "A Quiet Branch",
  pitch: "A focused scenario.",
  whatsStrange: "Nothing is compulsory.",
  genreTone: "Contemporary",
  angle: "Social",
  retainedNonNegotiables: ["User agency"],
};

test("Divergence proceed action remains reachable and full width on mobile", () => {
  const html = renderToString(<DivergenceStage
    takes={[take]}
    selectedTakeId={take.id}
    onSelectTake={() => undefined}
    onRerollAll={() => undefined}
    onPushFurther={() => undefined}
    onProceed={() => undefined}
    isLoading={false}
    sparkText="A premise"
  />);

  expect(html).toContain('data-divergence-action-footer="true"');
  expect(html).toContain('id="proceed-to-physics-btn"');
  expect(html).toContain("w-full sm:w-auto");
  expect(html).toContain("safe-area-inset-bottom");
});

test("Divergence exposes full-board history separately from take versions", () => {
  const html = renderToString(<DivergenceStage
    takes={[take]}
    selectedTakeId={take.id}
    onSelectTake={() => undefined}
    onRerollAll={() => undefined}
    onPushFurther={() => undefined}
    onProceed={() => undefined}
    isLoading={false}
    sparkText="A premise"
    boardIndex={1}
    boardCount={2}
    onSwitchBoard={() => undefined}
  />);

  expect(html).toContain("Board 2 of 2");
  expect(html).toContain('aria-label="Previous angle board"');
  expect(html).toContain('aria-label="Next angle board"');
});

test("a running single-angle reroll exposes a dedicated cancel action",()=>{
  const html=renderToString(<DivergenceStage takes={[take]} selectedTakeId={take.id} onSelectTake={()=>undefined} onRerollAll={()=>undefined} onPushFurther={()=>undefined} onRerollSingleTake={()=>undefined} onCancelSingleTake={()=>undefined} rerollingSingleId={take.id} onProceed={()=>undefined} isLoading={false} sparkText="A premise"/>);
  expect(html).toContain("Cancel reroll");
  expect(html).toContain('aria-label="Cancel reroll for A Quiet Branch"');
});
