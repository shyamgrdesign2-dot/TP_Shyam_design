import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import usePharmacyData from "../data/usePharmacyData";
import { seriesToXY, seriesToDonut } from "../charts/adapters";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";

// Pharmacy / Rx — #5. Top brands, company share and top salts.
export default function PharmacySection({ filters }) {
  const { loading, topBrands, companyShare, topSalts } = usePharmacyData({
    month: filters?.month,
  });

  const brandsXY = seriesToXY(topBrands);
  const shareDonut = seriesToDonut(companyShare);
  const saltsXY = seriesToXY(topSalts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionBlock title="Top brands" subtitle="This period">
        {loading ? (
          <Skeleton variant="rectangular" height={260} radius={12} />
        ) : (
          <BarChartZ
            data={brandsXY.data}
            xKey="x"
            series={brandsXY.series}
            fallbackLabels={["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"]}
            fallbackSeries={[{ key: "count", label: "No of Medicines" }]}
            height={260}
          />
        )}
      </SectionBlock>

      <SectionBlock title="Company share" subtitle="This period">
        {loading ? (
          <Skeleton variant="rectangular" height={260} radius={12} />
        ) : (
          <DonutWithLegend data={shareDonut} centerLabel="Companies" />
        )}
      </SectionBlock>

      <SectionBlock title="Top salts" subtitle="This period">
        {loading ? (
          <Skeleton variant="rectangular" height={260} radius={12} />
        ) : (
          <BarChartZ
            data={saltsXY.data}
            xKey="x"
            series={saltsXY.series}
            fallbackLabels={["Salt A", "Salt B", "Salt C"]}
            fallbackSeries={[
              { key: "c1", label: "Company A" },
              { key: "c2", label: "Company B" },
            ]}
            height={260}
            stacked
          />
        )}
      </SectionBlock>
    </div>
  );
}
