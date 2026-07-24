"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/data-states";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductOptions } from "@/modules/shared/hooks/use-products";
import { ProductionStepsEditor } from "./production-steps-editor";

/** Per-product production workflows — the ordered steps a JO item of that
 *  product moves through (Layout → Printing → Finishing …). Lives in JO
 *  Maintenance because the steps drive PRODUCTION, even though products are
 *  priced on the quotation side. A product with no steps of its own defaults to
 *  the GLOBAL workflow (so you don't retype the same steps for every service);
 *  opening its editor pre-fills the global steps, ready to save or tweak. */
export function ProductionWorkflowsCard({
  globalStepNames,
}: {
  globalStepNames: string[];
}) {
  const [q, setQ] = useState("");
  const products = useProductOptions();

  const rows = (products.data ?? []).filter(
    (p) =>
      !q.trim() ||
      p.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      p.category.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Production workflows</CardTitle>
        <CardDescription>
          The ordered steps a job of each product goes through — copied onto
          the JO items when a quotation converts. Products themselves are
          managed in Quotation Maintenance; their production workflow lives
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="relative max-w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product or category…"
            className="pl-8"
            aria-label="Search production workflows"
          />
        </div>

        {products.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "No matching products" : "No products yet"}
            description={
              q
                ? "Try a different search."
                : "Add products in Quotation Maintenance first — their workflows are set here."
            }
          />
        ) : (
          <ul className="grid gap-1">
            {rows.map((product) => {
              const usesGlobal = product.productionSteps.length === 0;
              // A product with no steps of its own falls back to the global
              // workflow — shown here and pre-filled in its editor.
              const effective = usesGlobal
                ? { ...product, productionSteps: globalStepNames }
                : product;
              return (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <span className="font-medium wrap-break-word">{product.name}</span>
                  <Badge variant="ghost">{product.category}</Badge>
                  <span className="flex-1 text-xs text-muted-foreground wrap-break-word">
                    {effective.productionSteps.length > 0
                      ? effective.productionSteps.join(" → ")
                      : "No steps yet"}
                  </span>
                  {usesGlobal && effective.productionSteps.length > 0 && (
                    <Badge variant="outline">global</Badge>
                  )}
                  <ProductionStepsEditor product={effective} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
