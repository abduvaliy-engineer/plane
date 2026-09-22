/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { usePopper } from "react-popper";
import { ChevronUpOutline, MoreVerticalOutline, TickOutline } from "@makeplane/propel/icons";
import { Popover, Transition } from "@headlessui/react";
// hooks
// ui
// icons
import type { TSupportedFilterTypeForUpdate } from "@plane/constants";
import { EIssueFilterType } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { TCalendarLayouts, TSupportedFilterForUpdate } from "@plane/types";
import { Switch } from "@makeplane/propel/components/switch";
// types
// constants
import { CALENDAR_LAYOUTS } from "@plane/constants";
import { useCalendarView } from "@/hooks/store/use-calendar-view";
import useSize from "@/hooks/use-window-size";
import type { ICycleIssuesFilter } from "@/store/issue/cycle";
import type { IModuleIssuesFilter } from "@/store/issue/module";
import type { IProjectIssuesFilter } from "@/store/issue/project";
import type { IProjectViewIssuesFilter } from "@/store/issue/project-views";

interface ICalendarHeader {
  issuesFilterStore: IProjectIssuesFilter | IModuleIssuesFilter | ICycleIssuesFilter | IProjectViewIssuesFilter;
  updateFilters?: (
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate
  ) => Promise<void>;
}

export const CalendarOptionsDropdown = observer(function CalendarOptionsDropdown(props: ICalendarHeader) {
  const { issuesFilterStore, updateFilters } = props;

  const { t } = useTranslation();

  const { projectId } = useParams();

  const issueCalendarView = useCalendarView();
  const [windowWidth] = useSize();

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // ref on the whole Popover container so we can recover dropped refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // bumped on every trigger click so the recovery effects re-run whenever
  // the panel opens or closes (Popover manages its own `open` state, not
  // exposed outside its render-prop, so we can't gate on `isOpen` directly)
  const [openTick, setOpenTick] = useState(0);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "auto",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (!referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [openTick, referenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never runs
  // and the panel renders at the document's default (0,0) corner instead of
  // anchored to the trigger button. Recover by locating the mounted panel
  // (not portaled here, so it lives inside the container DOM).
  useEffect(() => {
    if (popperElement || !dropdownRef.current) return;
    const container = dropdownRef.current;
    const find = () => {
      const el = container.querySelector<HTMLDivElement>(".fixed.z-50 > div");
      if (el) setPopperElement(el);
      return !!el;
    };
    if (!find()) {
      const t1 = setTimeout(find, 50);
      const t2 = setTimeout(find, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [openTick, popperElement]);

  const calendarLayout = issuesFilterStore.issueFilters?.displayFilters?.calendar?.layout ?? "month";
  const showWeekends = issuesFilterStore.issueFilters?.displayFilters?.calendar?.show_weekends ?? false;

  const handleLayoutChange = (layout: TCalendarLayouts, closePopover: any) => {
    if (!updateFilters) return;

    updateFilters(projectId?.toString(), EIssueFilterType.DISPLAY_FILTERS, {
      calendar: {
        ...issuesFilterStore.issueFilters?.displayFilters?.calendar,
        layout,
      },
    });

    issueCalendarView.updateCalendarPayload(
      layout === "month"
        ? issueCalendarView.calendarFilters.activeMonthDate
        : issueCalendarView.calendarFilters.activeWeekDate
    );
    if (windowWidth <= 768) closePopover(); // close the popover on mobile
  };

  const handleToggleWeekends = () => {
    const showWeekends = issuesFilterStore.issueFilters?.displayFilters?.calendar?.show_weekends ?? false;

    if (!updateFilters) return;

    updateFilters(projectId?.toString(), EIssueFilterType.DISPLAY_FILTERS, {
      calendar: {
        ...issuesFilterStore.issueFilters?.displayFilters?.calendar,
        show_weekends: !showWeekends,
      },
    });
  };

  return (
    <Popover ref={dropdownRef} className="relative flex items-center">
      {({ open, close: closePopover }) => (
        <>
          <Popover.Button as={React.Fragment}>
            <button type="button" ref={setReferenceElement} onClick={() => setOpenTick((t) => t + 1)}>
              <div
                className={`hidden items-center gap-1.5 rounded-sm bg-layer-1 px-2.5 py-1 text-11 outline-none hover:bg-layer-1 md:flex ${
                  open ? "text-primary" : "text-secondary"
                }`}
              >
                <div className="font-medium">{t("common.options")}</div>
                <div
                  className={`flex h-3.5 w-3.5 items-center justify-center transition-all ${open ? "" : "rotate-180"}`}
                >
                  <ChevronUpOutline width={12} />
                </div>
              </div>
              <div className="md:hidden">
                <MoreVerticalOutline className="h-4 text-secondary" />
              </div>
            </button>
          </Popover.Button>
          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="fixed z-50">
              <div
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
                className="absolute right-0 z-10 mt-1 min-w-[12rem] overflow-hidden rounded-sm border border-subtle bg-surface-1 p-1 shadow-raised-200"
                onClickCapture={(e) => {
                  // React 19 hit-testing sometimes resolves option clicks to
                  // this panel container instead of the actual button, so the
                  // click never reaches it. Resolve the intended button by
                  // click coordinates and re-dispatch a real click on it
                  // (synthetic clicks default to clientX/Y=0 so this can't
                  // recurse into itself).
                  const root = e.currentTarget as HTMLElement;
                  const items = Array.from(root.querySelectorAll<HTMLElement>("button")).filter(
                    (el) => el.getBoundingClientRect().height > 0
                  );
                  const option = items.find((el) => {
                    const r = el.getBoundingClientRect();
                    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
                  });
                  if (!option) return;
                  e.preventDefault();
                  e.stopPropagation();
                  option.click();
                }}
              >
                <div>
                  {Object.entries(CALENDAR_LAYOUTS).map(([layout, layoutDetails]) => (
                    <button
                      key={layout}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1.5 text-left text-11 hover:bg-layer-1"
                      onClick={() => handleLayoutChange(layoutDetails.key, closePopover)}
                    >
                      {layoutDetails.title}
                      {calendarLayout === layout && <TickOutline width={12} height={12} />}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1.5 text-left text-11 hover:bg-layer-1"
                    onClick={handleToggleWeekends}
                  >
                    {t("common.actions.show_weekends")}
                    <Switch
                      size="sm"
                      checked={showWeekends}
                      onCheckedChange={() => {
                        if (windowWidth <= 768) closePopover();
                      }}
                      aria-label={t("common.actions.show_weekends")}
                    />
                  </button>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
});
