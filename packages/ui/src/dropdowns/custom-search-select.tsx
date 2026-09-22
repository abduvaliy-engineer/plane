/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Combobox } from "@headlessui/react";
import { ChevronDownOutline, InfoOutline, SearchOutline, TickOutline } from "@makeplane/propel/icons";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { useOutsideClickDetector } from "@plane/hooks";
// plane imports
// local imports
import { Tooltip } from "@plane/propel/tooltip";
import { useDropdownKeyDown } from "../hooks/use-dropdown-key-down";
import { cn } from "../utils";
import type { ICustomSearchSelectProps } from "./helper";

export function CustomSearchSelect(props: ICustomSearchSelectProps) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    className = "",
    chevronClassName = "",
    customButton,
    placement,
    disabled = false,
    footerOption,
    input = false,
    label,
    maxHeight = "md",
    multiple = false,
    noChevron = false,
    onChange,
    options,
    onOpen,
    onClose,
    optionsClassName = "",
    value,
    tabIndex,
    noResultsMessage = "No matches found",
    defaultOpen = false,
  } = props;
  const [query, setQuery] = useState("");

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
  });

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (isOpen && !referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [isOpen, referenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never runs
  // and the portaled panel renders at the document's default (0,0) corner
  // instead of anchored to the trigger button. Recover by locating the open
  // panel mounted in document.body.
  useEffect(() => {
    if (popperElement) return;
    const find = () => {
      let el: HTMLDivElement | null = null;
      if (referenceElement?.id) {
        el = document.querySelector<HTMLDivElement>(`ul[aria-labelledby="${referenceElement.id}"] > div`);
      }
      if (!el) {
        el = document.querySelector<HTMLDivElement>('ul[data-headlessui-state="open"] > div, ul[data-open] > div');
      }
      if (el) setPopperElement(el);
      return !!el;
    };
    if (isOpen && !find()) {
      const t1 = setTimeout(find, 50);
      const t2 = setTimeout(find, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, popperElement, referenceElement]);

  const filteredOptions =
    query === "" ? options : options?.filter((option) => option.query.toLowerCase().includes(query.toLowerCase()));

  const comboboxProps: any = {
    value,
    onChange,
    disabled,
  };

  if (multiple) comboboxProps.multiple = true;

  const openDropdown = () => {
    setIsOpen(true);
    if (referenceElement) referenceElement.focus();
    if (onOpen) onOpen();
  };

  const closeDropdown = () => {
    setIsOpen(false);
    onClose && onClose();
  };

  const handleKeyDown = useDropdownKeyDown(openDropdown, closeDropdown, isOpen);
  useOutsideClickDetector(dropdownRef, closeDropdown);

  const toggleDropdown = () => {
    if (isOpen) closeDropdown();
    else openDropdown();
  };

  return (
    <Combobox
      as="div"
      ref={dropdownRef}
      tabIndex={tabIndex}
      className={cn("relative flex-shrink-0 text-left", className)}
      onKeyDown={handleKeyDown}
      {...comboboxProps}
    >
      {({ open }: { open: boolean }) => {
        if (open && onOpen) onOpen();

        return (
          <>
            {customButton ? (
              <Combobox.Button as={React.Fragment}>
                <button
                  ref={setReferenceElement}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-1 text-11",
                    {
                      "cursor-not-allowed text-secondary": disabled,
                      "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
                    },
                    customButtonClassName
                  )}
                  onClick={toggleDropdown}
                >
                  {customButton}
                </button>
              </Combobox.Button>
            ) : (
              <Combobox.Button as={React.Fragment}>
                <button
                  ref={setReferenceElement}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong",
                    {
                      "px-3 py-2 text-13": input,
                      "px-2 py-1 text-11": !input,
                      "cursor-not-allowed text-secondary": disabled,
                      "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
                    },
                    buttonClassName
                  )}
                  onClick={toggleDropdown}
                >
                  {label}
                  {!noChevron && !disabled && (
                    <ChevronDownOutline className={cn("h-3 w-3 flex-shrink-0", chevronClassName)} aria-hidden="true" />
                  )}
                </button>
              </Combobox.Button>
            )}
            {isOpen &&
              createPortal(
                <Combobox.Options as="ul" data-prevent-outside-click static>
                  <div
                    className={cn(
                      "z-30 my-1 min-w-48 overflow-y-scroll rounded-md border-[0.5px] border-subtle-1 bg-surface-1 py-2.5 text-11 whitespace-nowrap focus:outline-none",
                      optionsClassName
                    )}
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                  >
                    <div className="mx-2 flex items-center gap-1.5 rounded-sm border border-subtle px-2">
                      <SearchOutline className="h-3.5 w-3.5 text-placeholder" />
                      <Combobox.Input
                        className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search"
                        displayValue={(assigned: any) => assigned?.name}
                      />
                    </div>
                    <div
                      className={cn("vertical-scrollbar mt-2 scrollbar-xs space-y-1 overflow-y-scroll px-2", {
                        "max-h-96": maxHeight === "2xl",
                        "max-h-80": maxHeight === "xl",
                        "max-h-60": maxHeight === "lg",
                        "max-h-48": maxHeight === "md",
                        "max-h-36": maxHeight === "rg",
                        "max-h-28": maxHeight === "sm",
                      })}
                      onClickCapture={(e) => {
                        // React 19 hit-testing sometimes resolves option clicks to this
                        // list container instead of the option elements, so the click
                        // never reaches an option. Resolve the intended option by click
                        // coordinates and drive onChange directly.
                        const root = e.currentTarget as HTMLElement;
                        const items = Array.from(root.querySelectorAll<HTMLElement>("li, [role='option']")).filter(
                          (el) => el.getBoundingClientRect().height > 0
                        );
                        const option = items.find((el) => {
                          const r = el.getBoundingClientRect();
                          return (
                            e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
                          );
                        });
                        if (!option) return;
                        const idx = items.indexOf(option);
                        const target = filteredOptions?.[idx];
                        if (idx >= 0 && target && !target.disabled) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (multiple) {
                            const current: any[] = Array.isArray(value) ? value : [];
                            const next = current.includes(target.value)
                              ? current.filter((v) => v !== target.value)
                              : [...current, target.value];
                            onChange(next as any);
                          } else {
                            onChange(target.value);
                            closeDropdown();
                          }
                        }
                      }}
                    >
                      {filteredOptions ? (
                        filteredOptions.length > 0 ? (
                          filteredOptions.map((option) => (
                            <Combobox.Option
                              as="li"
                              key={option.value}
                              value={option.value}
                              className={({ active }) =>
                                cn(
                                  "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                                  {
                                    "bg-layer-transparent-hover": active,
                                    "cursor-not-allowed text-placeholder opacity-60": option.disabled,
                                  }
                                )
                              }
                              onClick={() => {
                                if (!multiple) closeDropdown();
                              }}
                              disabled={option.disabled}
                            >
                              {({ selected }) => (
                                <>
                                  <span className="flex-grow truncate">{option.content}</span>
                                  {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {option.tooltip && (
                                    <>
                                      {typeof option.tooltip === "string" ? (
                                        <Tooltip tooltipContent={option.tooltip}>
                                          <InfoOutline className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer text-secondary" />
                                        </Tooltip>
                                      ) : (
                                        option.tooltip
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        ) : (
                          <p className="px-1.5 py-1 text-placeholder italic">{noResultsMessage}</p>
                        )
                      ) : (
                        <p className="px-1.5 py-1 text-placeholder italic">Loading...</p>
                      )}
                    </div>
                    {footerOption}
                  </div>
                </Combobox.Options>,
                document.body
              )}
          </>
        );
      }}
    </Combobox>
  );
}
