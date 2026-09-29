"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function useQueryTab<T extends string>(
  paramKey: string,
  defaultValue: T,
  allowedValues: readonly T[],
): [T, (val: T) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentParam = searchParams.get(paramKey);
  const activeValue: T =
    currentParam && allowedValues.includes(currentParam as T)
      ? (currentParam as T)
      : defaultValue;

  const setValue = useCallback(
    (newValue: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue === defaultValue) {
        params.delete(paramKey);
      } else {
        params.set(paramKey, newValue);
      }
      const query = params.toString();
      const targetUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [searchParams, router, pathname, paramKey, defaultValue],
  );

  return [activeValue, setValue];
}
