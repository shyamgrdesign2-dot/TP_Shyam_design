/**
 * ServiceActions — Action buttons row in the service sub-card header.
 * Renders: Add quick visit, Book appointment, ⋮ overflow menu, and
 * the accordion collapse chevron.
 *
 * Exports: ServiceActions
 */
import { Add, Trash, Receipt1, Calendar2, DocumentText } from "iconsax-reactjs";
import { ChevronDown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { usePlanContext } from "./plan-context";
import styles from "./InProgressTab.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const dropdownContentClass = styles.dropdownContent;
const dropdownItemClass = styles.dropdownItem;

/**
 * Action buttons rendered in the service sub-card header (right side).
 *
 * @param {{ service: object, plan: object,
 *   isOpen: boolean, onToggle: Function,
 *   onDeleteOpen: Function }} props
 */
export function ServiceActions({ service, plan, isOpen, onToggle, onDeleteOpen }) {
  const { openDrawer } = usePlanContext();
  const isChikitsalayAccessable = useChikitsalay();

  return (
    <div className={styles.serviceCardActions}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild={true}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) onToggle?.();
              openDrawer({ type: "add-sitting", serviceId: service.id });
            }}
            className={styles.serviceActionButton}
            aria-label="Add quick visit record"
          >
            <Add size={18} variant="Linear" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className={styles.serviceActionTooltip}
        >
          Add quick visit record
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={styles.serviceMoreButton}
            aria-label="More actions"
          >
            <MoreVertical size={18} color="currentColor" strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={dropdownContentClass}>
          <DropdownMenuItem
            onClick={() =>
              openDrawer({
                type: "rx-preview",
                planId: plan.id,
                serviceId: service.id,
              })
            }
            className={dropdownItemClass}
          >
            <DocumentText size={16} variant="Linear" />
            View Consolidated Rx
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              openDrawer({
                type: "bill-preview",
                planId: plan.id,
                serviceId: service.id,
              })
            }
            className={dropdownItemClass}
          >
            <Receipt1 size={16} variant="Linear" />
            View Service Estimate
          </DropdownMenuItem>
          {!isChikitsalayAccessable && <DropdownMenuItem
            onClick={() => onDeleteOpen?.()}
            className={styles.deleteServiceMenuItem}
          >
            <Trash
              size={16}
              variant="Linear"
              className={styles.errorIcon}
            />
            <span className={styles.errorText}>Delete Service</span>
          </DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        aria-label={isOpen ? "Collapse service" : "Expand service"}
        className={styles.serviceCollapseButton}
      >
        <span
          className={cx(
            styles.serviceCollapseIcon,
            isOpen ? styles.serviceCollapseIconOpen : ""
          )}
        >
          <ChevronDown
            size={18}
            className={styles.currentColorIcon}
            strokeWidth={2}
          />
        </span>
      </button>
    </div>
  );
}
