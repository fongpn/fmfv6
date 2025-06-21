import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

const settingsSchema = z.object({
  grace_period_days: z.string().min(1, 'Grace period is required'),
  walk_in_rate: z.string().min(1, 'Walk-in rate is required'),
  registration_fee_default: z.string().min(1, 'Registration fee is required'),
  gym_name: z.string().min(1, 'Gym name is required'),
  currency_symbol: z.string().min(1, 'Currency symbol is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
}

export function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .order('key');

      if (error) throw error;

      setSettings(data || []);

      // Convert array to form data
      const formData: any = {};
      data?.forEach(setting => {
        formData[setting.key] = setting.value;
      });

      reset(formData);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      // Update each setting
      const updates = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      // Reload settings to get updated data
      await loadSettings();
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settingDescriptions: Record<string, string> = {
    grace_period_days: 'Number of days members can access the gym after their membership expires',
    walk_in_rate: 'Rate charged for walk-in access (per visit)',
    registration_fee_default: 'Default one-time registration fee for new members',
    gym_name: 'Name of the gym displayed throughout the system',
    currency_symbol: 'Currency symbol used for displaying prices',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <Button variant="outline" onClick={loadSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Global Configuration</h3>
          <p className="text-sm text-gray-600">
            Manage system-wide settings that affect all operations.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Gym Name"
                {...register('gym_name')}
                error={errors.gym_name?.message}
                helperText={settingDescriptions.gym_name}
              />

              <Input
                label="Currency Symbol"
                {...register('currency_symbol')}
                error={errors.currency_symbol?.message}
                helperText={settingDescriptions.currency_symbol}
              />

              <Input
                label="Grace Period (Days)"
                type="number"
                min="0"
                {...register('grace_period_days')}
                error={errors.grace_period_days?.message}
                helperText={settingDescriptions.grace_period_days}
              />

              <Input
                label="Walk-in Rate ($)"
                type="number"
                step="0.01"
                min="0"
                {...register('walk_in_rate')}
                error={errors.walk_in_rate?.message}
                helperText={settingDescriptions.walk_in_rate}
              />

              <Input
                label="Default Registration Fee ($)"
                type="number"
                step="0.01"
                min="0"
                {...register('registration_fee_default')}
                error={errors.registration_fee_default?.message}
                helperText={settingDescriptions.registration_fee_default}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty || saving}
              >
                Reset
              </Button>
              <Button
                type="submit"
                loading={saving}
                disabled={!isDirty || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Current Settings</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Setting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {setting.value}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {setting.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}