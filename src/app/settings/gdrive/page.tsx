import { redirect } from 'next/navigation';

export default function SettingsGDriveRedirect() {
  redirect('/settings/integrations');
}
