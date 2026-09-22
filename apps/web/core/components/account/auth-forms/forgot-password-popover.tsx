/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment, useEffect, useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Popover } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { CloseOutline } from "@makeplane/propel/icons";

export function ForgotPasswordPopover() {
  // popper-js refs
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // local open state, synced from Headless UI's render prop below, used to
  // drive the React 19 ref-recovery effects
  const [isOpen, setIsOpen] = useState(false);
  // ref to the Popover root, used to recover dropped popper refs on React 19
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // popper-js init
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "right-start",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });
  // plane hooks
  const { t } = useTranslation();

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
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
    <Popover className="relative" ref={dropdownRef}>
      {({ open }) => {
        if (isOpen !== open) setIsOpen(open);
        return (
          <>
            <Popover.Button as={Fragment}>
              <button
                type="button"
                ref={setReferenceElement}
                className="text-11 font-medium text-accent-primary outline-none"
              >
                {t("auth.common.forgot_password")}
              </button>
            </Popover.Button>
            <Popover.Panel className="fixed z-10">
              {({ close }) => (
                <div
                  className="z-10 ml-3 flex w-64 items-start gap-3 rounded-sm border border-strong bg-surface-1 px-2 py-1 text-left break-words"
                  ref={setPopperElement}
                  style={styles.popper}
                  {...attributes.popper}
                >
                  <span className="flex-shrink-0">🤥</span>
                  <p className="text-11">{t("auth.forgot_password.errors.smtp_not_enabled")}</p>
                  <button
                    type="button"
                    className="grid size-3 flex-shrink-0 place-items-center"
                    onClick={() => close()}
                    aria-label={t("aria_labels.auth_forms.close_popover")}
                  >
                    <CloseOutline className="size-3 text-secondary" />
                  </button>
                </div>
              )}
            </Popover.Panel>
          </>
        );
      }}
    </Popover>
  );
}
