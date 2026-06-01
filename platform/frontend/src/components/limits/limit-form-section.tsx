import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LimitCleanupIntervalSelect } from "@/components/limit-cleanup-interval-select";
import { LlmModelPicker } from "@/components/llm-model-picker";
import { useModelsWithApiKeys } from "@/lib/llm-models.query";
import { useLimits } from "@/lib/limits.query";
import { useMemo, useEffect } from "react";

export type LimitFormValues = {
  enabled: boolean;
  limitValue: string;
  cleanupInterval: string;
  isAllModels: boolean;
  models: string[];
  limitId?: string;
};

export function useEntityLimitFormState(
  entityType: string,
  entityId: string | null | undefined,
  setLimitValues: (values: LimitFormValues) => void
) {
  const { data: limits = [] } = useLimits();

  useEffect(() => {
    if (!entityId) {
      setLimitValues({
        enabled: false,
        limitValue: "",
        cleanupInterval: "24h",
        isAllModels: true,
        models: [],
      });
      return;
    }

    const entityLimit = limits.find(
      (l) => l.entityType === entityType && l.entityId === entityId
    );

    if (entityLimit) {
      setLimitValues({
        enabled: true,
        limitValue: String(entityLimit.limitValue),
        cleanupInterval: entityLimit.cleanupInterval ?? "24h",
        isAllModels: !entityLimit.model || entityLimit.model.length === 0,
        models: entityLimit.model ?? [],
        limitId: entityLimit.id,
      });
    } else {
      setLimitValues({
        enabled: false,
        limitValue: "",
        cleanupInterval: "24h",
        isAllModels: true,
        models: [],
      });
    }
  }, [limits, entityType, entityId, setLimitValues]);
}

export async function saveEntityLimit({
  entityId,
  entityType,
  limitValues,
  createLimit,
  updateLimit,
  deleteLimit,
}: {
  entityId: string;
  entityType: string;
  limitValues: LimitFormValues;
  createLimit: any;
  updateLimit: any;
  deleteLimit: any;
}) {
  if (limitValues.enabled) {
    const body = {
      entityType,
      entityId,
      limitType: "token_cost" as const,
      limitValue: Number(limitValues.limitValue),
      cleanupInterval: limitValues.cleanupInterval as any,
      model: limitValues.isAllModels ? null : limitValues.models,
    };

    if (limitValues.limitId) {
      await updateLimit.mutateAsync({
        id: limitValues.limitId,
        ...body,
      });
    } else {
      await createLimit.mutateAsync(body);
    }
  } else if (limitValues.limitId) {
    await deleteLimit.mutateAsync({ id: limitValues.limitId });
  }
}

export function LimitFormSection({
  values,
  onChange,
  entityTypeName,
}: {
  values: LimitFormValues;
  onChange: (values: LimitFormValues) => void;
  entityTypeName: string;
}) {
  const { data: modelsWithApiKeys = [] } = useModelsWithApiKeys();

  const modelOptions = useMemo(
    () =>
      modelsWithApiKeys.map((model) => ({
        value: model.modelId,
        model: model.modelId,
        provider: model.provider,
        pricePerMillionInput: model.pricePerMillionInput ?? "0",
        pricePerMillionOutput: model.pricePerMillionOutput ?? "0",
      })),
    [modelsWithApiKeys]
  );

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="enable-usage-limit"
          checked={values.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...values, enabled: !!checked })
          }
        />
        <Label htmlFor="enable-usage-limit" className="font-medium cursor-pointer">
          Enable usage limit for this {entityTypeName}
        </Label>
      </div>

      {values.enabled && (
        <div className="space-y-4 pl-6 border-l-2 border-primary/20 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit-value">Limit value ($)</Label>
              <Input
                id="limit-value"
                type="number"
                min="0"
                step="any"
                value={values.limitValue}
                onChange={(e) =>
                  onChange({ ...values, limitValue: e.target.value })
                }
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label>Reset interval</Label>
              <LimitCleanupIntervalSelect
                value={values.cleanupInterval as any}
                onValueChange={(val) =>
                  onChange({ ...values, cleanupInterval: val })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Apply to models</Label>
            <LlmModelPicker
              multiple
              sortDirection="desc"
              value={values.isAllModels ? ["all"] : values.models}
              onValueChange={(vals) => {
                const isAllModels = vals.includes("all");
                onChange({
                  ...values,
                  models: isAllModels ? [] : vals,
                  isAllModels,
                });
              }}
              models={modelOptions}
              editable
              includeAllOption
            />
          </div>
        </div>
      )}
    </div>
  );
}
