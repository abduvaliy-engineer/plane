/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { usePopper } from "react-popper";
import { Popover, Transition } from "@headlessui/react";
import { ChevronLeftOutline, ChevronRightOutline } from "@makeplane/propel/icons";
//hooks
// icons
// constants
import { getDate } from "@plane/utils";
import { MONTHS_LIST } from "@plane/constants";
import { useCalendarView } from "@/hooks/store/use-calendar-view";
import type { ICycleIssuesFilter } from "@/store/issue/cycle";
import type { IModuleIssuesFilter } from "@/store/issue/module";
import type { IProjectIssuesFilter } from "@/store/issue/project";
import type { IProjectViewIssuesFilter } from "@/store/issue/project-views";
// helpers

interface Props {
  issuesFilterStore: IProjectIssuesFilter | IModuleIssuesFilter | ICycleIssuesFilter | IProjectViewIssuesFilter;
}
export const CalendarMonthsDropdown = observer(function CalendarMonthsDropdown(props: Props) {
  const { issuesFilterStore } = props;

  const issueCalendarView = useCalendarView();

  const calendarLayout = issuesFilterStore.issueFilters?.displayFilters?.calendar?.layout ?? "month";

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

  const { activeMonthDate } = issueCalendarView.calendarFilters;

  const getWeekLayoutHeader = (): string => {
    const allDaysOfActiveWeek = issueCalendarView.allDaysOfActiveWeek;

    if (!allDaysOfActiveWeek) return "Week view";

    const daysList = Object.keys(allDaysOfActiveWeek);

    const firstDay = getDate(daysList[0]);
    const lastDay = getDate(daysList[daysList.length - 1]);

    if (!firstDay || !lastDay) return "Week view";

    if (firstDay.getMonth() === lastDay.getMonth() && firstDay.getFullYear() === lastDay.getFullYear())
      return `${MONTHS_LIST[firstDay.getMonth() + 1].title} ${firstDay.getFullYear()}`;

    if (firstDay.getFullYear() !== lastDay.getFullYear()) {
      return `${MONTHS_LIST[firstDay.getMonth() + 1].shortTitle} ${firstDay.getFullYear()} - ${
        MONTHS_LIST[lastDay.getMonth() + 1].shortTitle
      } ${lastDay.getFullYear()}`;
    } else
      return `${MONTHS_LIST[firstDay.getMonth() + 1].shortTitle} - ${
        MONTHS_LIST[lastDay.getMonth() + 1].shortTitle
      } ${lastDay.getFullYear()}`;
  };

  const handleDateChange = (date: Date) => {
    issueCalendarView.updateCalendarFilters({
      activeMonthDate: date,
    });
  };

  return (
    <Popover ref={dropdownRef} className="relative">
      <Popover.Button as={React.Fragment}>
        <button
          type="button"
          ref={setReferenceElement}
          className="text-18 font-semibold outline-none"
          disabled={calendarLayout === "week"}
          onClick={() => setOpenTick((t) => t + 1)}
        >
          {calendarLayout === "month"
            ? `${MONTHS_LIST[activeMonthDate.getMonth() + 1].title} ${activeMonthDate.getFullYear()}`
            : getWeekLayoutHeader()}
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
            className="w-56 divide-y divide-subtle-1 rounded-sm border border-subtle bg-surface-1 p-3 shadow-raised-200"
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
            <div className="flex items-center justify-between gap-2 pb-3">
              <button
                type="button"
                className="grid place-items-center"
                onClick={() => {
                  const previousYear = new Date(activeMonthDate.getFullYear() - 1, activeMonthDate.getMonth(), 1);
                  handleDateChange(previousYear);
                }}
              >
                <ChevronLeftOutline height={14} width={14} />
              </button>
              <span className="text-11">{activeMonthDate.getFullYear()}</span>
              <button
                type="button"
                className="grid place-items-center"
                onClick={() => {
                  const nextYear = new Date(activeMonthDate.getFullYear() + 1, activeMonthDate.getMonth(), 1);
                  handleDateChange(nextYear);
                }}
              >
                <ChevronRightOutline height={14} width={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 items-stretch justify-items-stretch gap-4 pt-3">
              {Object.values(MONTHS_LIST).map((month, index) => (
                <button
                  key={month.shortTitle}
                  type="button"
                  className="rounded-sm py-0.5 text-11 hover:bg-layer-1"
                  onClick={() => {
                    const newDate = new Date(activeMonthDate.getFullYear(), index, 1);
                    handleDateChange(newDate);
                  }}
                >
                  {month.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
});
