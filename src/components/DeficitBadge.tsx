import { BadgeSlot } from './BadgeSlot'

export function DeficitBadge({ isDeficit }: { isDeficit: boolean }) {
  if (!isDeficit) return null
  return <BadgeSlot label="thin" tooltip="This position is a structural deficit on your roster" color="yellow" />
}

export function SwapBadge({ benchFor }: { benchFor: string | null | undefined }) {
  if (!benchFor) return null
  return <BadgeSlot label="swap?" tooltip={`Optimizer would start ${benchFor} instead`} color="blue" />
}
