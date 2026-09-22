/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Combobox } from "@headlessui/react";

import React from "react";
import { TickOutline } from "@makeplane/propel/icons";
// helpers
import { cn } from "../../utils";
// types
import type { IMultiSelectDropdownOptions, ISingleSelectDropdownOptions } from "../dropdown";
// components
import { DropdownOptionsLoader, InputSearch } from ".";

export function DropdownOptions(props: IMultiSelectDropdownOptions | ISingleSelectDropdownOptions) {
  const {
    isOpen,
    query,
    setQuery,
    inputIcon,
    inputPlaceholder,
    inputClassName,
    inputContainerClassName,
    disableSearch,
    keyExtractor,
    options,
    handleClose,
    onOptionClick,
    renderItem,
    loader,
    isMobile = false,
  } = props;
  return (
    <>
      {!disableSearch && (
        <InputSearch
          isOpen={isOpen}
          query={query}
          updateQuery={(query) => setQuery(query)}
          inputIcon={inputIcon}
          inputPlaceholder={inputPlaceholder}
          inputClassName={inputClassName}
          inputContainerClassName={inputContainerClassName}
          isMobile={isMobile}
        />
      )}
      <div
        className={cn("max-h-48 overflow-y-scroll", !disableSearch && "mt-2")}
        onClickCapture={(e) => {
          // React 19 hit-testing sometimes resolves option clicks to this
          // options list container instead of the option `li` elements, so
          // the click never reaches an option. Resolve the intended option
          // by click coordinates and drive selection directly. This div is
          // separate from the search-input area above, so we never
          // intercept clicks meant for the input.
          if (!options) return;
          const root = e.currentTarget as HTMLElement;
          const items = Array.from(root.querySelectorAll<HTMLElement>("li, [role='option']")).filter(
            (el) => el.getBoundingClientRect().height > 0
          );
          const option = items.find((el) => {
            const r = el.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          });
          if (!option) return;
          const idx = items.indexOf(option);
          const target = options[idx];
          if (idx >= 0 && target && !target.disabled) {
            e.preventDefault();
            e.stopPropagation();
            onOptionClick?.(keyExtractor(target));
            handleClose?.();
          }
        }}
      >
        <>
          {options ? (
            options.length > 0 ? (
              <ul className="space-y-1">
                {options?.map((option) => (
                  <Combobox.Option
                    as="li"
                    key={keyExtractor(option)}
                    value={keyExtractor(option)}
                    disabled={option.disabled}
                    className={({ active, selected }) =>
                      cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                        {
                          "bg-layer-1": active,
                          "text-primary": selected,
                          "text-secondary": !selected,
                        },
                        option.className && option.className({ active, selected })
                      )
                    }
                    onClick={handleClose}
                  >
                    {({ selected }) => (
                      <>
                        {renderItem ? (
                          <>{renderItem({ value: keyExtractor(option), selected, disabled: option.disabled })}</>
                        ) : (
                          <>
                            <span className="flex-grow truncate">{option.value}</span>
                            {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
                          </>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))}
              </ul>
            ) : (
              <p className="px-1.5 py-1 text-placeholder italic">No matching results</p>
            )
          ) : loader ? (
            <> {loader} </>
          ) : (
            <DropdownOptionsLoader />
          )}
        </>
      </div>
    </>
  );
}
