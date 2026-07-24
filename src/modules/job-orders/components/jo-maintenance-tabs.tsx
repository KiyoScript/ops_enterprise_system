"use client";

import { useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LookupManager } from "@/modules/shared/components/lookup-manager";
import { EmployeeManager } from "@/modules/shared/components/employee-manager";
import { GlobalWorkflowManager } from "./global-workflow-manager";
import { ProductionWorkflowsCard } from "./production-workflows-card";
import type { LookupDto } from "@/modules/shared/schemas/lookup";
import type { EmployeeDto } from "@/modules/shared/schemas/employee";
import type { GlobalStepDto } from "../schemas/production-workflow";

/** JO Maintenance as one-section-per-tab (ruling 2026-07-17): each reference
 *  list gets its own tab instead of stacking every card on one long page.
 *  The active tab lives in the URL (?tab=…) so links land on the right one. */
export function JoMaintenanceTabs({
  statuses,
  categories,
  employees,
  globalSteps,
}: {
  statuses: LookupDto[];
  categories: LookupDto[];
  employees: EmployeeDto[];
  globalSteps: GlobalStepDto[];
}) {
  const [tab, setTab] = useQueryState("tab", { defaultValue: "statuses" });

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
      <TabsList>
        <TabsTrigger value="statuses">Production statuses</TabsTrigger>
        <TabsTrigger value="categories">Service categories</TabsTrigger>
        <TabsTrigger value="workflows">Production workflow</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
      </TabsList>

      <TabsContent value="statuses">
        <LookupManager
          type="JO_STATUS"
          title="Production statuses"
          description={`"Status - Department" values. Statuses containing done/completed/delivered/finished/closed auto-archive an item; "pick up / delivery" statuses mark it waiting.`}
          items={statuses}
        />
      </TabsContent>

      <TabsContent value="categories">
        <LookupManager
          type="JO_CATEGORY"
          title="Service categories"
          description={`Item categories (legacy OPSServices). The "Sales - " prefix is stripped on import; categories marked LFP auto-tick the large-format flag when picked on a JO item.`}
          items={categories}
          withLFP
          importConfig={{
            url: "/api/lookups/import-categories",
            hint: "Or import the OPSServices sheet (.xlsx or .csv):",
          }}
        />
      </TabsContent>

      <TabsContent value="workflows">
        <div className="grid gap-6">
          <GlobalWorkflowManager items={globalSteps} />
          <ProductionWorkflowsCard
            globalStepNames={globalSteps.filter((s) => s.isActive).map((s) => s.name)}
          />
        </div>
      </TabsContent>

      <TabsContent value="employees">
        <EmployeeManager items={employees} />
      </TabsContent>
    </Tabs>
  );
}
