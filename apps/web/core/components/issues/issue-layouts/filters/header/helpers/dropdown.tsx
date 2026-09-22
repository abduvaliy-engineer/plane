/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { Fragment, useEffect, useRef, useState } from "react";
import type { Placement } from "@popperjs/core";
import { usePopper } from "react-popper";
// headless ui
import { Popover, Transition } from "@headlessui/react";
// ui
import { Button } from "@plane/propel/button";

type Props = {
  children: React.ReactNode;
  icon?: React.ReactElement;
  miniIcon?: React.ReactNode;
  title?: string;
  placement?: Placement;
  disabled?: boolean;
  tabIndex?: number;
  menuButton?: React.ReactNode;
  isFiltersApplied?: boolean;
};

export function FiltersDropdown(props: Props) {
  const {
    children,
    miniIcon,
    icon,
    title = "Dropdown",
    placement,
    disabled = false,
    tabIndex,
    menuButton,
    isFiltersApplied = false,
  } = props;

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | HTMLDivElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // ref to the Popover root, used to recover dropped popper refs on React 19
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // local open state, synced from Headless UI's render prop below, used to
  // drive the React 19 ref-recovery effects
  const [isOpen, setIsOpen] = useState(false);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "auto",
  });

  // On React 19 the trigger button's/div's ref callback can be dropped after
  // a disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger from the container DOM.
  useEffect(() => {
    if (isOpen && !referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [isOpen, referenceElement]);

  // On React 19 the panel div's ref callback can similarly be dropped,
  // leaving popperElement null forever: popper never runs and the panel
  // stays at 0x0. The panel is not portaled (no createPortal call), so it
  // remains inside this Popover's own subtree — recover it from there.
  useEffect(() => {
    if (popperElement) return;
    const find = () => {
      if (!dropdownRef.current) return false;
      const el = dropdownRef.current.querySelector<HTMLDivElement>(".fixed.z-10 > div");
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
  }, [isOpen, popperElement]);

  return (
    <Popover as="div" ref={dropdownRef}>
      {({ open }) => {
        if (isOpen !== open) setIsOpen(open);
        return (
          <>
          <Popover.Button as={React.Fragment}>
            {menuButton ? (
              <button type="button" ref={setReferenceElement}>
                {menuButton}
              </button>
            ) : (
              <div ref={setReferenceElement}>
                <div className="hidden @4xl:flex">
                  <Button
                    disabled={disabled}
                    variant="secondary"
                    prependIcon={icon}
                    tabIndex={tabIndex}
                    className="relative"
                    size="lg"
                  >
                    <>
                      <div className={`${open ? "text-primary" : "text-secondary"}`}>
                        <span>{title}</span>
                      </div>
                      {isFiltersApplied && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent-primary" />
                      )}
                    </>
                  </Button>
                </div>
                <div className="flex @4xl:hidden">
                  <Button
                    disabled={disabled}
                    ref={setReferenceElement}
                    variant="secondary"
                    tabIndex={tabIndex}
                    size="lg"
                  >
                    {miniIcon || title}
                  </Button>
                </div>
              </div>
            )}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            {/** translate-y-0 is a hack to create new stacking context. Required for safari  */}
            <Popover.Panel className="fixed z-10 translate-y-0">
              <div
                className="my-1 overflow-hidden rounded-sm border border-subtle bg-surface-1 shadow-raised-100"
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
              >
                <div className="flex max-h-[30rem] w-[18.75rem] flex-col overflow-hidden lg:max-h-[37.5rem]">
                  {children}
                </div>
              </div>
            </Popover.Panel>
          </Transition>
          </>
        );
      }}
    </Popover>
  );
}
