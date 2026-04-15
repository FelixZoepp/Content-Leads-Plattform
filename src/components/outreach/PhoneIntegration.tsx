import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PhoneIntegration: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedNumber, setSavedNumber] = useState<string | null>(null);

  useEffect(() => {
    loadPhoneNumber();
  }, []);

  const loadPhoneNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single();

      if (profile?.phone_number) {
        setSavedNumber(profile.phone_number);
        setPhoneNumber(profile.phone_number);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error loading phone number:', error);
    }
  };

  const connectPhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Bitte gib eine Telefonnummer ein');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht angemeldet');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', user.id);

      if (error) throw error;

      setSavedNumber(phoneNumber);
      setIsConnected(true);
      toast.success('Telefonnummer verbunden');
    } catch (error) {
      console.error('Error connecting phone:', error);
      toast.error('Fehler beim Verbinden der Telefonnummer');
    } finally {
      setLoading(false);
    }
  };

  const disconnectPhoneNumber = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: null })
        .eq('id', user.id);

      if (error) throw error;

      setSavedNumber(null);
      setPhoneNumber('');
      setIsConnected(false);
      toast.success('Telefonnummer getrennt');
    } catch (error) {
      console.error('Error disconnecting phone:', error);
      toast.error('Fehler beim Trennen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Telefon-Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
              <Check className="h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium">Verbunden</p>
                <p className="text-sm text-muted-foreground">{savedNumber}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={disconnectPhoneNumber}
              disabled={loading}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Telefon trennen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Deine Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diese Nummer wird für ausgehende Anrufe verwendet
              </p>
            </div>
            <Button
              onClick={connectPhoneNumber}
              disabled={loading}
              className="w-full"
            >
              <Phone className="mr-2 h-4 w-4" />
              Telefon verbinden
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneIntegration;