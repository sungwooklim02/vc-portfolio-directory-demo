// Apache ECharts 6.1.0 (Apache-2.0) core + only the charts/components/features the directory map view uses
// (LabelLayout makes the city labels' labelLayout.hideOverlap work),
// and topojson-client 3.1.0 (ISC) `feature` to turn the local world-atlas TopoJSON into GeoJSON.
// Bundled by scripts/build-assets.mjs into public/vendor/echarts-lite-6.1.0.min.js (IIFE, global ECHARTS_LITE).
import { use, init, registerMap, getMap } from "echarts/core";
import { BarChart, ScatterChart, EffectScatterChart } from "echarts/charts";
import { GeoComponent, GridComponent, TooltipComponent, AriaComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { LabelLayout } from "echarts/features";
import { feature } from "topojson-client";

use([BarChart, ScatterChart, EffectScatterChart, GeoComponent, GridComponent, TooltipComponent, AriaComponent, LabelLayout, SVGRenderer]);

export { init, registerMap, getMap, feature };
