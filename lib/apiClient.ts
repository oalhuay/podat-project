import { backendFetch } from "@/lib/backend";

type ApiError = Error & { code?: string };
type DynamicValue = ReturnType<typeof JSON.parse>;
type DynamicRow = Record<string, DynamicValue>;
type DynamicData = DynamicRow[] & DynamicRow;

export type ApiResult<T = unknown> = {
  data: T;
  error: ApiError | null;
};

type Filter = {
  operator: "eq" | "in" | "gte" | "lte";
  column: string;
  value: unknown;
};

type QueryRequest = {
  table: string;
  action: "select" | "insert" | "upsert" | "update" | "delete";
  columns: string;
  payload?: unknown;
  filters: Filter[];
  order?: {
    column: string;
    ascending: boolean;
    nulls_first?: boolean;
  };
  limit?: number;
  mode: "many" | "single" | "maybe_single";
  on_conflict?: string;
};

const toApiError = (error: unknown): ApiError => {
  if (error instanceof Error) return error as ApiError;
  return new Error(String(error)) as ApiError;
};

class BackendQueryBuilder implements PromiseLike<ApiResult<DynamicData>> {
  private request: QueryRequest;

  constructor(table: string) {
    this.request = {
      table,
      action: "select",
      columns: "*",
      filters: [],
      mode: "many",
    };
  }

  select(columns = "*") {
    this.request.columns = columns;
    return this;
  }

  insert(payload: unknown) {
    this.request.action = "insert";
    this.request.payload = payload;
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string }) {
    this.request.action = "upsert";
    this.request.payload = payload;
    this.request.on_conflict = options?.onConflict;
    return this;
  }

  update(payload: unknown) {
    this.request.action = "update";
    this.request.payload = payload;
    return this;
  }

  delete() {
    this.request.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.request.filters.push({ operator: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.request.filters.push({ operator: "in", column, value: values });
    return this;
  }

  gte(column: string, value: unknown) {
    this.request.filters.push({ operator: "gte", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.request.filters.push({ operator: "lte", column, value });
    return this;
  }

  order(
    column: string,
    options?: {
      ascending?: boolean;
      nullsFirst?: boolean;
    }
  ) {
    this.request.order = {
      column,
      ascending: options?.ascending ?? true,
      nulls_first: options?.nullsFirst,
    };
    return this;
  }

  limit(value: number) {
    this.request.limit = value;
    return this;
  }

  single() {
    this.request.mode = "single";
    return this;
  }

  maybeSingle() {
    this.request.mode = "maybe_single";
    return this;
  }

  private async execute(): Promise<ApiResult<DynamicData>> {
    try {
      const response = await backendFetch<{ data: DynamicData }>("/api/data/query", {
        method: "POST",
        body: JSON.stringify(this.request),
      });
      return { data: response.data, error: null };
    } catch (error) {
      return {
        data: null as unknown as DynamicData,
        error: toApiError(error),
      };
    }
  }

  then<TResult1 = ApiResult<DynamicData>, TResult2 = never>(
    onfulfilled?:
      | ((value: ApiResult<DynamicData>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const apiClient = {
  from: (table: string) => new BackendQueryBuilder(table),
  rpc: async (
    functionName: string,
    params: Record<string, unknown>
  ): Promise<ApiResult<DynamicData>> => {
    try {
      const response = await backendFetch<{ data: DynamicData }>("/api/data/rpc", {
        method: "POST",
        body: JSON.stringify({
          function: functionName,
          params,
        }),
      });
      return { data: response.data, error: null };
    } catch (error) {
      return {
        data: null as unknown as DynamicData,
        error: toApiError(error),
      };
    }
  },
};
