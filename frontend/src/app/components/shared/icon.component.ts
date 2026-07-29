import { Component, Input } from '@angular/core';
import {
  LucideHouse,
  LucideSettings,
  LucideBuilding2,
  LucideUsers,
  LucideCalculator,
  LucideFileText,
  LucideFolderOpen,
  LucideRecycle,
  LucideNewspaper,
  LucideCalendarDays,
  LucideRefreshCw,
  LucideNotepadText,
  LucideRepeat,
  LucideClock,
  LucideInbox,
  LucideArchive,
  LucidePuzzle,
  LucideMailbox,
  LucideMonitor,
  LucideLibrary,
  LucideGlobe,
  LucideReceipt,
  LucideAward,
  LucideConstruction,
  LucideTrash2,
  LucideCircleCheck,
  LucideWallet,
  LucideTelescope,
  LucideHourglass,
  LucideSprout,
  LucideTarget,
  LucideHandshake,
  LucidePenLine,
  LucideTruck,
  LucideScale,
  LucideChartLine,
  LucideSearch,
  LucideFilePenLine,
  LucideMapPin,
  LucideSlidersHorizontal,
  LucidePercent,
  LucideShuffle,
  LucideTreePine,
  LucideUpload,
  LucideMap,
  LucideBanknote,
  LucideGift,
  LucideCompass,
  LucideTrees,
  LucideWrench,
  LucideSearchCheck,
  LucideFlaskConical,
  LucideMicroscope,
  LucideFile,
  LucideDraftingCompass,
  LucideRuler,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideHash,
  LucideSignalHigh,
  LucidePackage,
  LucideZap,
  LucideStore,
  LucideFactory,
  LucideFileStack,
  LucideFolder,
  LucideClipboardList
} from '@lucide/angular';

/** Nombres soportados por <app-icon>, en el mismo kebab-case usado por
 *  sidebar-menu.service.ts (routeCatalog[].icon / iconMap). Agregar un ícono
 *  nuevo acá implica: importar su clase de '@lucide/angular' arriba, sumarla
 *  a `imports` y agregar su @case abajo. */
export type IconName =
  | 'home' | 'settings' | 'building-2' | 'users' | 'calculator' | 'file-text'
  | 'folder-open' | 'recycle' | 'newspaper' | 'calendar-days' | 'refresh-cw'
  | 'notepad-text' | 'repeat' | 'clock' | 'inbox' | 'archive' | 'puzzle'
  | 'mailbox' | 'monitor' | 'library' | 'globe' | 'receipt' | 'award'
  | 'construction' | 'trash-2' | 'circle-check' | 'wallet' | 'telescope'
  | 'hourglass' | 'sprout' | 'target' | 'handshake' | 'pen-line' | 'truck'
  | 'scale' | 'chart-line' | 'search' | 'file-pen-line' | 'map-pin'
  | 'sliders-horizontal' | 'percent' | 'shuffle' | 'tree-pine' | 'upload'
  | 'map' | 'banknote' | 'gift' | 'compass' | 'trees' | 'wrench'
  | 'search-check' | 'flask-conical' | 'microscope' | 'file'
  | 'drafting-compass' | 'ruler' | 'trending-down' | 'trending-up' | 'hash'
  | 'signal-high' | 'package' | 'zap' | 'store' | 'factory' | 'file-stack'
  | 'clipboard-list' | 'folder';

const ICONS = [
  LucideHouse, LucideSettings, LucideBuilding2, LucideUsers, LucideCalculator,
  LucideFileText, LucideFolderOpen, LucideRecycle, LucideNewspaper,
  LucideCalendarDays, LucideRefreshCw, LucideNotepadText, LucideRepeat,
  LucideClock, LucideInbox, LucideArchive, LucidePuzzle, LucideMailbox,
  LucideMonitor, LucideLibrary, LucideGlobe, LucideReceipt, LucideAward,
  LucideConstruction, LucideTrash2, LucideCircleCheck, LucideWallet,
  LucideTelescope, LucideHourglass, LucideSprout, LucideTarget, LucideHandshake,
  LucidePenLine, LucideTruck, LucideScale, LucideChartLine, LucideSearch,
  LucideFilePenLine, LucideMapPin, LucideSlidersHorizontal, LucidePercent,
  LucideShuffle, LucideTreePine, LucideUpload, LucideMap, LucideBanknote,
  LucideGift, LucideCompass, LucideTrees, LucideWrench, LucideSearchCheck,
  LucideFlaskConical, LucideMicroscope, LucideFile, LucideDraftingCompass,
  LucideRuler, LucideTrendingDown, LucideTrendingUp, LucideHash,
  LucideSignalHigh, LucidePackage, LucideZap, LucideStore, LucideFactory,
  LucideFileStack, LucideFolder, LucideClipboardList
];

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: ICONS,
  template: `
    @switch (name) {
      @case ('home') { <svg lucideHouse [size]="size" [color]="color"></svg> }
      @case ('settings') { <svg lucideSettings [size]="size" [color]="color"></svg> }
      @case ('building-2') { <svg lucideBuilding2 [size]="size" [color]="color"></svg> }
      @case ('users') { <svg lucideUsers [size]="size" [color]="color"></svg> }
      @case ('calculator') { <svg lucideCalculator [size]="size" [color]="color"></svg> }
      @case ('file-text') { <svg lucideFileText [size]="size" [color]="color"></svg> }
      @case ('folder-open') { <svg lucideFolderOpen [size]="size" [color]="color"></svg> }
      @case ('recycle') { <svg lucideRecycle [size]="size" [color]="color"></svg> }
      @case ('newspaper') { <svg lucideNewspaper [size]="size" [color]="color"></svg> }
      @case ('calendar-days') { <svg lucideCalendarDays [size]="size" [color]="color"></svg> }
      @case ('refresh-cw') { <svg lucideRefreshCw [size]="size" [color]="color"></svg> }
      @case ('notepad-text') { <svg lucideNotepadText [size]="size" [color]="color"></svg> }
      @case ('repeat') { <svg lucideRepeat [size]="size" [color]="color"></svg> }
      @case ('clock') { <svg lucideClock [size]="size" [color]="color"></svg> }
      @case ('inbox') { <svg lucideInbox [size]="size" [color]="color"></svg> }
      @case ('archive') { <svg lucideArchive [size]="size" [color]="color"></svg> }
      @case ('puzzle') { <svg lucidePuzzle [size]="size" [color]="color"></svg> }
      @case ('mailbox') { <svg lucideMailbox [size]="size" [color]="color"></svg> }
      @case ('monitor') { <svg lucideMonitor [size]="size" [color]="color"></svg> }
      @case ('library') { <svg lucideLibrary [size]="size" [color]="color"></svg> }
      @case ('globe') { <svg lucideGlobe [size]="size" [color]="color"></svg> }
      @case ('receipt') { <svg lucideReceipt [size]="size" [color]="color"></svg> }
      @case ('award') { <svg lucideAward [size]="size" [color]="color"></svg> }
      @case ('construction') { <svg lucideConstruction [size]="size" [color]="color"></svg> }
      @case ('trash-2') { <svg lucideTrash2 [size]="size" [color]="color"></svg> }
      @case ('circle-check') { <svg lucideCircleCheck [size]="size" [color]="color"></svg> }
      @case ('wallet') { <svg lucideWallet [size]="size" [color]="color"></svg> }
      @case ('telescope') { <svg lucideTelescope [size]="size" [color]="color"></svg> }
      @case ('hourglass') { <svg lucideHourglass [size]="size" [color]="color"></svg> }
      @case ('sprout') { <svg lucideSprout [size]="size" [color]="color"></svg> }
      @case ('target') { <svg lucideTarget [size]="size" [color]="color"></svg> }
      @case ('handshake') { <svg lucideHandshake [size]="size" [color]="color"></svg> }
      @case ('pen-line') { <svg lucidePenLine [size]="size" [color]="color"></svg> }
      @case ('truck') { <svg lucideTruck [size]="size" [color]="color"></svg> }
      @case ('scale') { <svg lucideScale [size]="size" [color]="color"></svg> }
      @case ('chart-line') { <svg lucideChartLine [size]="size" [color]="color"></svg> }
      @case ('search') { <svg lucideSearch [size]="size" [color]="color"></svg> }
      @case ('file-pen-line') { <svg lucideFilePenLine [size]="size" [color]="color"></svg> }
      @case ('map-pin') { <svg lucideMapPin [size]="size" [color]="color"></svg> }
      @case ('sliders-horizontal') { <svg lucideSlidersHorizontal [size]="size" [color]="color"></svg> }
      @case ('percent') { <svg lucidePercent [size]="size" [color]="color"></svg> }
      @case ('shuffle') { <svg lucideShuffle [size]="size" [color]="color"></svg> }
      @case ('tree-pine') { <svg lucideTreePine [size]="size" [color]="color"></svg> }
      @case ('upload') { <svg lucideUpload [size]="size" [color]="color"></svg> }
      @case ('map') { <svg lucideMap [size]="size" [color]="color"></svg> }
      @case ('banknote') { <svg lucideBanknote [size]="size" [color]="color"></svg> }
      @case ('gift') { <svg lucideGift [size]="size" [color]="color"></svg> }
      @case ('compass') { <svg lucideCompass [size]="size" [color]="color"></svg> }
      @case ('trees') { <svg lucideTrees [size]="size" [color]="color"></svg> }
      @case ('wrench') { <svg lucideWrench [size]="size" [color]="color"></svg> }
      @case ('search-check') { <svg lucideSearchCheck [size]="size" [color]="color"></svg> }
      @case ('flask-conical') { <svg lucideFlaskConical [size]="size" [color]="color"></svg> }
      @case ('microscope') { <svg lucideMicroscope [size]="size" [color]="color"></svg> }
      @case ('file') { <svg lucideFile [size]="size" [color]="color"></svg> }
      @case ('drafting-compass') { <svg lucideDraftingCompass [size]="size" [color]="color"></svg> }
      @case ('ruler') { <svg lucideRuler [size]="size" [color]="color"></svg> }
      @case ('trending-down') { <svg lucideTrendingDown [size]="size" [color]="color"></svg> }
      @case ('trending-up') { <svg lucideTrendingUp [size]="size" [color]="color"></svg> }
      @case ('hash') { <svg lucideHash [size]="size" [color]="color"></svg> }
      @case ('signal-high') { <svg lucideSignalHigh [size]="size" [color]="color"></svg> }
      @case ('package') { <svg lucidePackage [size]="size" [color]="color"></svg> }
      @case ('zap') { <svg lucideZap [size]="size" [color]="color"></svg> }
      @case ('store') { <svg lucideStore [size]="size" [color]="color"></svg> }
      @case ('factory') { <svg lucideFactory [size]="size" [color]="color"></svg> }
      @case ('file-stack') { <svg lucideFileStack [size]="size" [color]="color"></svg> }
      @case ('clipboard-list') { <svg lucideClipboardList [size]="size" [color]="color"></svg> }
      @default { <svg lucideFolder [size]="size" [color]="color"></svg> }
    }
  `
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 18;
  @Input() color = 'currentColor';
}
