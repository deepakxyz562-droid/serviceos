'use client';

/**
 * Team section.
 *
 * The spec maps both the legacy "Users" tab and the legacy "Roles" tab
 * to a single Business Owner section called "Team". This component
 * stacks them: members list first (the day-to-day surface), then the
 * roles + permission matrix + basic security card.
 */

import { UsersSettings } from './users-settings';
import { RolesSettings } from './roles-settings';

export function TeamSettings() {
  return (
    <div className="space-y-8">
      <UsersSettings />
      <RolesSettings />
    </div>
  );
}
