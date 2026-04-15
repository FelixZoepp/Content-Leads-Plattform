import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight, Camera, Loader2, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { prepareAvatarUpload } from "@/lib/avatarImage";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export default function UserAccountHeader() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Fehler beim Ausloggen");
    } else {
      toast.success("Erfolgreich ausgeloggt");
      navigate("/auth");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      if (!file.type.startsWith("image/")) {
        toast.error("Bitte wähle eine Bilddatei aus");
        return;
      }

      const processedFile = await prepareAvatarUpload(file);

      // Create a unique filename with user id as folder
      const fileName = `${Date.now()}.webp`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, processedFile, {
          upsert: true,
          contentType: processedFile.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Profilbild aktualisiert!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Fehler beim Hochladen des Bildes");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-3 border-b border-white/5">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="h-3 w-20 bg-white/10 rounded mb-1" />
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-3 border-b border-white/5">
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors group">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white/10">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 text-left hidden lg:block min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors hidden lg:block" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="right" 
          align="start" 
          className="w-72 p-4 bg-background/95 backdrop-blur-xl border border-white/10"
        >
          <div className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-16 w-16 border-2 border-white/10">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg font-medium">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{profile.name}</p>
                <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Mein Profil</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
              <Link
                to="/integrations"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Einstellungen</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
              <button
                onClick={() => {
                  const html = document.documentElement;
                  const isLight = html.classList.contains("light");
                  if (isLight) {
                    html.classList.remove("light");
                    html.style.colorScheme = "dark";
                    localStorage.setItem("theme", "dark");
                  } else {
                    html.classList.add("light");
                    html.style.colorScheme = "light";
                    localStorage.setItem("theme", "light");
                  }
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors w-full"
              >
                {document.documentElement.classList.contains("light") ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span>{document.documentElement.classList.contains("light") ? "Dark Mode" : "Light Mode"}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
