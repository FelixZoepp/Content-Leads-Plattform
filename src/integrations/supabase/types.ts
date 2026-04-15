export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_integrations: {
        Row: {
          account_id: string
          created_at: string
          enrichment_webhook_url: string | null
          heygen_api_key_id: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          id: string
          sip_display_name: string | null
          sip_domain: string | null
          sip_enabled: boolean | null
          sip_password_encrypted: string | null
          sip_provider: string | null
          sip_server: string | null
          sip_username: string | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_username: string | null
          telephony_country: string | null
          telephony_onboarding_completed: boolean | null
          telephony_provider: string | null
          telephony_timezone: string | null
          telephony_webhook_secret: string | null
          telephony_webhook_verified: boolean | null
          telephony_webhook_verified_at: string | null
          twilio_account_sid: string | null
          twilio_api_key_secret: string | null
          twilio_api_key_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          twilio_twiml_app_sid: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          enrichment_webhook_url?: string | null
          heygen_api_key_id?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          sip_display_name?: string | null
          sip_domain?: string | null
          sip_enabled?: boolean | null
          sip_password_encrypted?: string | null
          sip_provider?: string | null
          sip_server?: string | null
          sip_username?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          telephony_country?: string | null
          telephony_onboarding_completed?: boolean | null
          telephony_provider?: string | null
          telephony_timezone?: string | null
          telephony_webhook_secret?: string | null
          telephony_webhook_verified?: boolean | null
          telephony_webhook_verified_at?: string | null
          twilio_account_sid?: string | null
          twilio_api_key_secret?: string | null
          twilio_api_key_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          twilio_twiml_app_sid?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          enrichment_webhook_url?: string | null
          heygen_api_key_id?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          sip_display_name?: string | null
          sip_domain?: string | null
          sip_enabled?: boolean | null
          sip_password_encrypted?: string | null
          sip_provider?: string | null
          sip_server?: string | null
          sip_username?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          telephony_country?: string | null
          telephony_onboarding_completed?: boolean | null
          telephony_provider?: string | null
          telephony_timezone?: string | null
          telephony_webhook_secret?: string | null
          telephony_webhook_verified?: boolean | null
          telephony_webhook_verified_at?: string | null
          twilio_account_sid?: string | null
          twilio_api_key_secret?: string | null
          twilio_api_key_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          twilio_twiml_app_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_phone_numbers: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          label: string | null
          phone_number: string
          updated_at: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          phone_number: string
          updated_at?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          phone_number?: string
          updated_at?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_phone_numbers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_team_members: {
        Row: {
          account_id: string
          created_at: string
          email: string
          extension: string | null
          id: string
          is_active: boolean | null
          name: string
          phone_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          extension?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          extension?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_team_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          case_studies: Json | null
          company_name: string | null
          created_at: string
          custom_domain: string | null
          default_deal_amount: number | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          primary_brand_color: string | null
          secondary_brand_color: string | null
          service_description: string | null
          subscription_status: string | null
          tagline: string | null
          target_audience: string | null
          unique_selling_points: string[] | null
          updated_at: string
        }
        Insert: {
          case_studies?: Json | null
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          default_deal_amount?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_brand_color?: string | null
          secondary_brand_color?: string | null
          service_description?: string | null
          subscription_status?: string | null
          tagline?: string | null
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string
        }
        Update: {
          case_studies?: Json | null
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          default_deal_amount?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_brand_color?: string | null
          secondary_brand_color?: string | null
          service_description?: string | null
          subscription_status?: string | null
          tagline?: string | null
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          duration_min: number | null
          id: string
          note: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"] | null
          timestamp: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          duration_min?: number | null
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          timestamp?: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          duration_min?: number | null
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          timestamp?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summaries: {
        Row: {
          created_at: string | null
          id: number
          scope: string | null
          summary_text: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          scope?: string | null
          summary_text: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          scope?: string | null
          summary_text?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string | null
          id: number
          message: string
          resolved_at: string | null
          severity: string | null
          tenant_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: string
          resolved_at?: string | null
          severity?: string | null
          tenant_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string
          resolved_at?: string | null
          severity?: string | null
          tenant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          token: string | null
          token_hash: string | null
          token_prefix: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          token?: string | null
          token_hash?: string | null
          token_prefix?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token?: string | null
          token_hash?: string | null
          token_prefix?: string | null
          user_id?: string
        }
        Relationships: []
      }
      benchmarks: {
        Row: {
          created_at: string
          id: string
          metric: Database["public"]["Enums"]["benchmark_metric"]
          metric_key: string
          metric_label: string
          target_value: number
          tenant_id: string
          tier1_max: number
          tier2_max: number
          unit: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metric: Database["public"]["Enums"]["benchmark_metric"]
          metric_key: string
          metric_label: string
          target_value: number
          tenant_id: string
          tier1_max?: number
          tier2_max?: number
          unit?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metric?: Database["public"]["Enums"]["benchmark_metric"]
          metric_key?: string
          metric_label?: string
          target_value?: number
          tenant_id?: string
          tier1_max?: number
          tier2_max?: number
          unit?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_scripts: {
        Row: {
          account_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          system_context: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          system_context?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_context?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          account_id: string | null
          action_items: string[] | null
          created_at: string
          deal_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          key_points: string[] | null
          objections_detected: Json | null
          recording_duration_seconds: number | null
          recording_url: string | null
          sentiment: string | null
          started_at: string
          summary: string | null
          summary_generated_at: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          action_items?: string[] | null
          created_at?: string
          deal_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          key_points?: string[] | null
          objections_detected?: Json | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          sentiment?: string | null
          started_at?: string
          summary?: string | null
          summary_generated_at?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          action_items?: string[] | null
          created_at?: string
          deal_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          key_points?: string[] | null
          objections_detected?: Json | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          sentiment?: string | null
          started_at?: string
          summary?: string | null
          summary_generated_at?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          acceptance_rate_pct: number | null
          account_id: string | null
          assigned_user_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          id: string
          landing_page_id: string | null
          linkedin_currently_active: boolean | null
          linkedin_profile_age: string | null
          linkedin_was_banned: boolean | null
          max_daily_connections: number | null
          max_daily_messages: number | null
          name: string
          pitch_video_url: string | null
          recommended_connections: number | null
          start_date: string | null
          status: string
          updated_at: string
          voice_source_audio_url: string | null
        }
        Insert: {
          acceptance_rate_pct?: number | null
          account_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          landing_page_id?: string | null
          linkedin_currently_active?: boolean | null
          linkedin_profile_age?: string | null
          linkedin_was_banned?: boolean | null
          max_daily_connections?: number | null
          max_daily_messages?: number | null
          name: string
          pitch_video_url?: string | null
          recommended_connections?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          voice_source_audio_url?: string | null
        }
        Update: {
          acceptance_rate_pct?: number | null
          account_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          landing_page_id?: string | null
          linkedin_currently_active?: boolean | null
          linkedin_profile_age?: string | null
          linkedin_was_banned?: boolean | null
          max_daily_connections?: number | null
          max_daily_messages?: number | null
          name?: string
          pitch_video_url?: string | null
          recommended_connections?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          voice_source_audio_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_id: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          phone: string | null
          street: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          account_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          account_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_member_links: {
        Row: {
          campaign_id: string
          connection_accepted_at: string | null
          connection_sent_at: string | null
          contact_id: string
          created_at: string
          first_message_sent_at: string | null
          fu1_sent_at: string | null
          fu2_sent_at: string | null
          fu3_sent_at: string | null
          heygen_video_id: string | null
          id: string
          outreach_message: string | null
          personalized_url: string | null
          slug: string | null
          updated_at: string
          user_id: string
          video_error: string | null
          video_generated_at: string | null
          video_status: string | null
          video_url: string | null
          workflow_status: string | null
        }
        Insert: {
          campaign_id: string
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          contact_id: string
          created_at?: string
          first_message_sent_at?: string | null
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          heygen_video_id?: string | null
          id?: string
          outreach_message?: string | null
          personalized_url?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
          video_error?: string | null
          video_generated_at?: string | null
          video_status?: string | null
          video_url?: string | null
          workflow_status?: string | null
        }
        Update: {
          campaign_id?: string
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          contact_id?: string
          created_at?: string
          first_message_sent_at?: string | null
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          heygen_video_id?: string | null
          id?: string
          outreach_message?: string | null
          personalized_url?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
          video_error?: string | null
          video_generated_at?: string | null
          video_status?: string | null
          video_url?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_member_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_member_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_member_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_member_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          appointment_booked_at: string | null
          campaign_id: string | null
          channels_active: string[] | null
          city: string | null
          company: string | null
          company_id: string | null
          connection_accepted_at: string | null
          connection_sent_at: string | null
          country: string | null
          created_at: string
          daily_messages_count: number | null
          email: string | null
          external_id: string | null
          first_message_sent_at: string | null
          first_name: string
          fu1_sent_at: string | null
          fu2_sent_at: string | null
          fu3_sent_at: string | null
          heygen_video_id: string | null
          id: string
          intro_video_url: string | null
          last_message_date: string | null
          last_name: string
          lead_score: number | null
          lead_type: Database["public"]["Enums"]["lead_type"] | null
          linkedin_url: string | null
          mobile: string | null
          notes: string | null
          outreach_message: string | null
          outreach_status: Database["public"]["Enums"]["outreach_status"] | null
          owner_user_id: string | null
          personalized_url: string | null
          phone: string | null
          position: string | null
          positive_reply_at: string | null
          responded_at: string | null
          slug: string | null
          source: string | null
          stage: string | null
          status: string | null
          street: string | null
          tags: string[] | null
          updated_at: string
          video_error: string | null
          video_generated_at: string | null
          video_status: string | null
          video_url: string | null
          view_count: number | null
          viewed: boolean | null
          viewed_at: string | null
          website: string | null
          workflow_status:
            | Database["public"]["Enums"]["linkedin_workflow_status"]
            | null
        }
        Insert: {
          account_id: string
          appointment_booked_at?: string | null
          campaign_id?: string | null
          channels_active?: string[] | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          country?: string | null
          created_at?: string
          daily_messages_count?: number | null
          email?: string | null
          external_id?: string | null
          first_message_sent_at?: string | null
          first_name: string
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          heygen_video_id?: string | null
          id?: string
          intro_video_url?: string | null
          last_message_date?: string | null
          last_name: string
          lead_score?: number | null
          lead_type?: Database["public"]["Enums"]["lead_type"] | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          outreach_message?: string | null
          outreach_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          owner_user_id?: string | null
          personalized_url?: string | null
          phone?: string | null
          position?: string | null
          positive_reply_at?: string | null
          responded_at?: string | null
          slug?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          street?: string | null
          tags?: string[] | null
          updated_at?: string
          video_error?: string | null
          video_generated_at?: string | null
          video_status?: string | null
          video_url?: string | null
          view_count?: number | null
          viewed?: boolean | null
          viewed_at?: string | null
          website?: string | null
          workflow_status?:
            | Database["public"]["Enums"]["linkedin_workflow_status"]
            | null
        }
        Update: {
          account_id?: string
          appointment_booked_at?: string | null
          campaign_id?: string | null
          channels_active?: string[] | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          country?: string | null
          created_at?: string
          daily_messages_count?: number | null
          email?: string | null
          external_id?: string | null
          first_message_sent_at?: string | null
          first_name?: string
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          heygen_video_id?: string | null
          id?: string
          intro_video_url?: string | null
          last_message_date?: string | null
          last_name?: string
          lead_score?: number | null
          lead_type?: Database["public"]["Enums"]["lead_type"] | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          outreach_message?: string | null
          outreach_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          owner_user_id?: string | null
          personalized_url?: string | null
          phone?: string | null
          position?: string | null
          positive_reply_at?: string | null
          responded_at?: string | null
          slug?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          street?: string | null
          tags?: string[] | null
          updated_at?: string
          video_error?: string | null
          video_generated_at?: string | null
          video_status?: string | null
          video_url?: string | null
          view_count?: number | null
          viewed?: boolean | null
          viewed_at?: string | null
          website?: string | null
          workflow_status?:
            | Database["public"]["Enums"]["linkedin_workflow_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_subscriptions: {
        Row: {
          account_id: string
          created_at: string
          current_period_end: string | null
          extra_credits: number
          id: string
          package: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          current_period_end?: string | null
          extra_credits?: number
          id?: string
          package: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          current_period_end?: string | null
          extra_credits?: number
          id?: string
          package?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_responses: {
        Row: {
          comment: string | null
          created_at: string | null
          csat_1_5: number | null
          id: number
          nps_0_10: number | null
          respondent_email: string | null
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          csat_1_5?: number | null
          id?: number
          nps_0_10?: number | null
          respondent_email?: string | null
          tenant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          csat_1_5?: number | null
          id?: number
          nps_0_10?: number | null
          respondent_email?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          account_id: string
          created_at: string
          domain: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          ssl_activated_at: string | null
          ssl_active: boolean
          status: string
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          domain: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          ssl_activated_at?: string | null
          ssl_active?: boolean
          status?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          domain?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          ssl_activated_at?: string | null
          ssl_active?: boolean
          status?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          amount_eur: number | null
          closer_id: string | null
          contact_id: string | null
          created_at: string
          due_date: string | null
          id: string
          next_action: string | null
          pipeline: string | null
          probability_pct: number | null
          setter_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount_eur?: number | null
          closer_id?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          next_action?: string | null
          pipeline?: string | null
          probability_pct?: number | null
          setter_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount_eur?: number | null
          closer_id?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          next_action?: string | null
          pipeline?: string | null
          probability_pct?: number | null
          setter_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_leads: {
        Row: {
          ab_variant: string | null
          bounced_at: string | null
          campaign_id: string
          clicked_count: number | null
          contact_id: string
          created_at: string
          current_step: number | null
          id: string
          last_sent_at: string | null
          next_send_at: string | null
          opened_count: number | null
          replied_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ab_variant?: string | null
          bounced_at?: string | null
          campaign_id: string
          clicked_count?: number | null
          contact_id: string
          created_at?: string
          current_step?: number | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          opened_count?: number | null
          replied_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ab_variant?: string | null
          bounced_at?: string | null
          campaign_id?: string
          clicked_count?: number | null
          contact_id?: string
          created_at?: string
          current_step?: number | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          opened_count?: number | null
          replied_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_steps: {
        Row: {
          body_text: string
          campaign_id: string
          created_at: string
          delay_days: number
          id: string
          step_order: number
          subject: string
          total_clicked: number | null
          total_opened: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          body_text: string
          campaign_id: string
          created_at?: string
          delay_days?: number
          id?: string
          step_order?: number
          subject: string
          total_clicked?: number | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          body_text?: string
          campaign_id?: string
          created_at?: string
          delay_days?: number
          id?: string
          step_order?: number
          subject?: string
          total_clicked?: number | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          account_id: string
          created_at: string
          daily_send_limit: number | null
          description: string | null
          id: string
          name: string
          send_days: string[] | null
          send_end_hour: number | null
          send_start_hour: number | null
          status: string
          timezone: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_leads: number | null
          total_opened: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          daily_send_limit?: number | null
          description?: string | null
          id?: string
          name: string
          send_days?: string[] | null
          send_end_hour?: number | null
          send_start_hour?: number | null
          status?: string
          timezone?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_leads?: number | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          daily_send_limit?: number | null
          description?: string | null
          id?: string
          name?: string
          send_days?: string[] | null
          send_end_hour?: number | null
          send_start_hour?: number | null
          status?: string
          timezone?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_leads?: number | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          account_id: string | null
          body_html: string
          click_count: number | null
          contact_id: string | null
          created_at: string
          from_email: string
          id: string
          open_count: number | null
          opened_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          to_email: string
          tracking_id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          body_html: string
          click_count?: number | null
          contact_id?: string | null
          created_at?: string
          from_email: string
          id?: string
          open_count?: number | null
          opened_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          to_email: string
          tracking_id?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          body_html?: string
          click_count?: number | null
          contact_id?: string | null
          created_at?: string
          from_email?: string
          id?: string
          open_count?: number | null
          opened_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
          tracking_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          account_id: string | null
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking_events: {
        Row: {
          created_at: string
          email_log_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email_log_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email_log_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      encrypted_api_keys: {
        Row: {
          account_id: string
          created_at: string
          encrypted_value: string
          id: string
          key_name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          encrypted_value: string
          id?: string
          key_name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          encrypted_value?: string
          id?: string
          key_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_api_keys_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_credits: {
        Row: {
          account_id: string
          created_at: string
          email_credits_limit: number
          email_credits_used: number
          id: string
          month_year: string
          phone_credits_limit: number
          phone_credits_used: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email_credits_limit?: number
          email_credits_used?: number
          id?: string
          month_year: string
          phone_credits_limit?: number
          phone_credits_used?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email_credits_limit?: number
          email_credits_used?: number
          id?: string
          month_year?: string
          phone_credits_limit?: number
          phone_credits_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_credits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_access: {
        Row: {
          id: string
          account_id: string | null
          feature: string
          is_active: boolean | null
          activated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          account_id?: string | null
          feature: string
          is_active?: boolean | null
          activated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string | null
          feature?: string
          is_active?: boolean | null
          activated_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_tracking: {
        Row: {
          avg_days_to_payment: number | null
          cash_collected: number | null
          costs_ads: number | null
          costs_other: number | null
          costs_personnel: number | null
          costs_tools: number | null
          created_at: string
          id: string
          invoices_open_amount: number | null
          invoices_open_count: number | null
          invoices_overdue_amount: number | null
          invoices_overdue_count: number | null
          notes: string | null
          period_month: string
          revenue_onetime: number | null
          revenue_recurring: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avg_days_to_payment?: number | null
          cash_collected?: number | null
          costs_ads?: number | null
          costs_other?: number | null
          costs_personnel?: number | null
          costs_tools?: number | null
          created_at?: string
          id?: string
          invoices_open_amount?: number | null
          invoices_open_count?: number | null
          invoices_overdue_amount?: number | null
          invoices_overdue_count?: number | null
          notes?: string | null
          period_month: string
          revenue_onetime?: number | null
          revenue_recurring?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avg_days_to_payment?: number | null
          cash_collected?: number | null
          costs_ads?: number | null
          costs_other?: number | null
          costs_personnel?: number | null
          costs_tools?: number | null
          created_at?: string
          id?: string
          invoices_open_amount?: number | null
          invoices_open_count?: number | null
          invoices_overdue_amount?: number | null
          invoices_overdue_count?: number | null
          notes?: string | null
          period_month?: string
          revenue_onetime?: number | null
          revenue_recurring?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_templates: {
        Row: {
          account_id: string | null
          campaign_id: string | null
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          campaign_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          campaign_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_tracking: {
        Row: {
          churn_reason: string | null
          contract_end: string | null
          contract_renewed: boolean | null
          contract_start: string | null
          created_at: string
          csat_score: number | null
          deal_closed_at: string | null
          id: string
          milestones_completed: number | null
          milestones_total: number | null
          notes: string | null
          nps_score: number | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          project_actual_end: string | null
          project_planned_end: string | null
          project_start_date: string | null
          project_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          churn_reason?: string | null
          contract_end?: string | null
          contract_renewed?: boolean | null
          contract_start?: string | null
          created_at?: string
          csat_score?: number | null
          deal_closed_at?: string | null
          id?: string
          milestones_completed?: number | null
          milestones_total?: number | null
          notes?: string | null
          nps_score?: number | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          project_actual_end?: string | null
          project_planned_end?: string | null
          project_start_date?: string | null
          project_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          churn_reason?: string | null
          contract_end?: string | null
          contract_renewed?: boolean | null
          contract_start?: string | null
          created_at?: string
          csat_score?: number | null
          deal_closed_at?: string | null
          id?: string
          milestones_completed?: number | null
          milestones_total?: number | null
          notes?: string | null
          nps_score?: number | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          project_actual_end?: string | null
          project_planned_end?: string | null
          project_start_date?: string | null
          project_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          color: string | null
          created_at: string | null
          id: number
          rationale_text: string | null
          score: number
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: number
          rationale_text?: string | null
          score: number
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: number
          rationale_text?: string | null
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      icp_customers: {
        Row: {
          annual_revenue: string | null
          close_date: string | null
          close_duration: string | null
          collaboration_score: number | null
          contact_name: string | null
          created_at: string
          customer_name: string
          days_to_payment: number | null
          deal_value: number | null
          employee_count: string | null
          has_paid: boolean | null
          id: string
          industry: string | null
          lead_source: string | null
          notes: string | null
          onboarding_date: string | null
          payment_speed: string | null
          payment_status: string | null
          problem_awareness: string | null
          project_end_date: string | null
          project_start_date: string | null
          result_score: number | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          annual_revenue?: string | null
          close_date?: string | null
          close_duration?: string | null
          collaboration_score?: number | null
          contact_name?: string | null
          created_at?: string
          customer_name: string
          days_to_payment?: number | null
          deal_value?: number | null
          employee_count?: string | null
          has_paid?: boolean | null
          id?: string
          industry?: string | null
          lead_source?: string | null
          notes?: string | null
          onboarding_date?: string | null
          payment_speed?: string | null
          payment_status?: string | null
          problem_awareness?: string | null
          project_end_date?: string | null
          project_start_date?: string | null
          result_score?: number | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          annual_revenue?: string | null
          close_date?: string | null
          close_duration?: string | null
          collaboration_score?: number | null
          contact_name?: string | null
          created_at?: string
          customer_name?: string
          days_to_payment?: number | null
          deal_value?: number | null
          employee_count?: string | null
          has_paid?: boolean | null
          id?: string
          industry?: string | null
          lead_source?: string | null
          notes?: string | null
          onboarding_date?: string | null
          payment_speed?: string | null
          payment_status?: string | null
          problem_awareness?: string | null
          project_end_date?: string | null
          project_start_date?: string | null
          result_score?: number | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icp_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string
          email_hint: string | null
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by: string
          email_hint?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string
          email_hint?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          appointments_scheduled: number | null
          created_at: string
          engagement_rate: number | null
          id: string
          impressions: number | null
          leads_generated: number | null
          new_followers: number | null
          posts_count: number | null
          qualified_leads: number | null
          revenue: number | null
          sales_closed: number | null
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          appointments_scheduled?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          leads_generated?: number | null
          new_followers?: number | null
          posts_count?: number | null
          qualified_leads?: number | null
          revenue?: number | null
          sales_closed?: number | null
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          appointments_scheduled?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          leads_generated?: number | null
          new_followers?: number | null
          posts_count?: number | null
          qualified_leads?: number | null
          revenue?: number | null
          sales_closed?: number | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          account_id: string | null
          calendar_url: string | null
          content: Json
          created_at: string
          custom_domain: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          og_image_url: string | null
          prompt: string | null
          published_at: string | null
          slug: string
          status: string
          styles: Json
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          account_id?: string | null
          calendar_url?: string | null
          content?: Json
          created_at?: string
          custom_domain?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          og_image_url?: string | null
          prompt?: string | null
          published_at?: string | null
          slug: string
          status?: string
          styles?: Json
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          account_id?: string | null
          calendar_url?: string | null
          content?: Json
          created_at?: string
          custom_domain?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          og_image_url?: string | null
          prompt?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          styles?: Json
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_list_items: {
        Row: {
          account_id: string
          city: string | null
          company: string | null
          contact_id: string | null
          country: string | null
          created_at: string
          email: string | null
          employee_count: string | null
          enriched: boolean | null
          first_name: string
          id: string
          imported: boolean | null
          industry: string | null
          last_name: string
          linkedin_url: string | null
          list_id: string
          phone: string | null
          position: string | null
          website: string | null
        }
        Insert: {
          account_id: string
          city?: string | null
          company?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employee_count?: string | null
          enriched?: boolean | null
          first_name: string
          id?: string
          imported?: boolean | null
          industry?: string | null
          last_name: string
          linkedin_url?: string | null
          list_id: string
          phone?: string | null
          position?: string | null
          website?: string | null
        }
        Update: {
          account_id?: string
          city?: string | null
          company?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employee_count?: string | null
          enriched?: boolean | null
          first_name?: string
          id?: string
          imported?: boolean | null
          industry?: string | null
          last_name?: string
          linkedin_url?: string | null
          list_id?: string
          phone?: string | null
          position?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_list_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_list_items_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_list_items_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lead_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_lists: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          search_filters: Json | null
          total_leads: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          search_filters?: Json | null
          total_leads?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          search_filters?: Json | null
          total_leads?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_lists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_page_templates: {
        Row: {
          accent_color: string | null
          account_id: string | null
          background_color: string | null
          calendar_url: string | null
          case_studies: Json | null
          case_studies_badge: string | null
          case_studies_headline: string | null
          case_studies_subheadline: string | null
          coaching_badge: string | null
          coaching_headline: string | null
          coaching_subheadline: string | null
          combined_headline: string | null
          combined_text: string | null
          comparison_badge: string | null
          comparison_headline: string | null
          comparison_subheadline: string | null
          created_at: string
          cta_badge: string | null
          cta_button_text: string | null
          cta_description: string | null
          cta_headline: string | null
          faq_badge: string | null
          faq_headline: string | null
          faq_items: Json | null
          faq_subheadline: string | null
          footer_company_name: string | null
          footer_datenschutz_url: string | null
          footer_impressum_url: string | null
          footer_tagline: string | null
          guarantee_badge: string | null
          guarantee_description: string | null
          guarantee_headline: string | null
          guarantee_items: Json | null
          header_cta_text: string | null
          header_logo_accent: string | null
          header_logo_text: string | null
          header_nav_items: Json | null
          hero_cta_text: string | null
          hero_headline: string | null
          hero_subheadline: string | null
          hero_video_caption: string | null
          id: string
          is_active: boolean
          name: string
          others_items: Json | null
          others_title: string | null
          pillar1_description: string | null
          pillar1_items: Json | null
          pillar1_subtitle: string | null
          pillar1_title: string | null
          pillar2_description: string | null
          pillar2_items: Json | null
          pillar2_subtitle: string | null
          pillar2_title: string | null
          primary_color: string | null
          secondary_color: string | null
          testimonials: Json | null
          testimonials_badge: string | null
          testimonials_headline: string | null
          testimonials_subheadline: string | null
          text_color: string | null
          updated_at: string
          us_items: Json | null
          us_title: string | null
        }
        Insert: {
          accent_color?: string | null
          account_id?: string | null
          background_color?: string | null
          calendar_url?: string | null
          case_studies?: Json | null
          case_studies_badge?: string | null
          case_studies_headline?: string | null
          case_studies_subheadline?: string | null
          coaching_badge?: string | null
          coaching_headline?: string | null
          coaching_subheadline?: string | null
          combined_headline?: string | null
          combined_text?: string | null
          comparison_badge?: string | null
          comparison_headline?: string | null
          comparison_subheadline?: string | null
          created_at?: string
          cta_badge?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_headline?: string | null
          faq_badge?: string | null
          faq_headline?: string | null
          faq_items?: Json | null
          faq_subheadline?: string | null
          footer_company_name?: string | null
          footer_datenschutz_url?: string | null
          footer_impressum_url?: string | null
          footer_tagline?: string | null
          guarantee_badge?: string | null
          guarantee_description?: string | null
          guarantee_headline?: string | null
          guarantee_items?: Json | null
          header_cta_text?: string | null
          header_logo_accent?: string | null
          header_logo_text?: string | null
          header_nav_items?: Json | null
          hero_cta_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          hero_video_caption?: string | null
          id?: string
          is_active?: boolean
          name?: string
          others_items?: Json | null
          others_title?: string | null
          pillar1_description?: string | null
          pillar1_items?: Json | null
          pillar1_subtitle?: string | null
          pillar1_title?: string | null
          pillar2_description?: string | null
          pillar2_items?: Json | null
          pillar2_subtitle?: string | null
          pillar2_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          testimonials?: Json | null
          testimonials_badge?: string | null
          testimonials_headline?: string | null
          testimonials_subheadline?: string | null
          text_color?: string | null
          updated_at?: string
          us_items?: Json | null
          us_title?: string | null
        }
        Update: {
          accent_color?: string | null
          account_id?: string | null
          background_color?: string | null
          calendar_url?: string | null
          case_studies?: Json | null
          case_studies_badge?: string | null
          case_studies_headline?: string | null
          case_studies_subheadline?: string | null
          coaching_badge?: string | null
          coaching_headline?: string | null
          coaching_subheadline?: string | null
          combined_headline?: string | null
          combined_text?: string | null
          comparison_badge?: string | null
          comparison_headline?: string | null
          comparison_subheadline?: string | null
          created_at?: string
          cta_badge?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_headline?: string | null
          faq_badge?: string | null
          faq_headline?: string | null
          faq_items?: Json | null
          faq_subheadline?: string | null
          footer_company_name?: string | null
          footer_datenschutz_url?: string | null
          footer_impressum_url?: string | null
          footer_tagline?: string | null
          guarantee_badge?: string | null
          guarantee_description?: string | null
          guarantee_headline?: string | null
          guarantee_items?: Json | null
          header_cta_text?: string | null
          header_logo_accent?: string | null
          header_logo_text?: string | null
          header_nav_items?: Json | null
          hero_cta_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          hero_video_caption?: string | null
          id?: string
          is_active?: boolean
          name?: string
          others_items?: Json | null
          others_title?: string | null
          pillar1_description?: string | null
          pillar1_items?: Json | null
          pillar1_subtitle?: string | null
          pillar1_title?: string | null
          pillar2_description?: string | null
          pillar2_items?: Json | null
          pillar2_subtitle?: string | null
          pillar2_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          testimonials?: Json | null
          testimonials_badge?: string | null
          testimonials_headline?: string | null
          testimonials_subheadline?: string | null
          text_color?: string | null
          updated_at?: string
          us_items?: Json | null
          us_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_page_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tracking_events: {
        Row: {
          account_id: string | null
          contact_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          page_url: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          account_id?: string | null
          contact_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          account_id?: string | null
          contact_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tracking_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tracking_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tracking_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_snapshot: {
        Row: {
          appointments: number | null
          calls_interested: number | null
          calls_made: number | null
          calls_reached: number | null
          cash_collected: number | null
          closings: number | null
          closings_held: number | null
          closings_planned: number | null
          cold_emails_replies: number | null
          cold_emails_sent: number | null
          comments: number | null
          created_at: string | null
          deal_volume: number | null
          deals: number | null
          dms_replies: number | null
          dms_sent: number | null
          followers_current: number | null
          id: number
          impressions: number | null
          leads_qualified: number | null
          leads_total: number | null
          likes: number | null
          link_clicks: number | null
          monthly_retainer: number | null
          new_followers: number | null
          period_date: string
          period_type: string | null
          post_type: string | null
          post_url: string | null
          posts: string | null
          revenue: number | null
          settings_held: number | null
          settings_planned: number | null
          tenant_id: string
          words_spoken: number | null
        }
        Insert: {
          appointments?: number | null
          calls_interested?: number | null
          calls_made?: number | null
          calls_reached?: number | null
          cash_collected?: number | null
          closings?: number | null
          closings_held?: number | null
          closings_planned?: number | null
          cold_emails_replies?: number | null
          cold_emails_sent?: number | null
          comments?: number | null
          created_at?: string | null
          deal_volume?: number | null
          deals?: number | null
          dms_replies?: number | null
          dms_sent?: number | null
          followers_current?: number | null
          id?: number
          impressions?: number | null
          leads_qualified?: number | null
          leads_total?: number | null
          likes?: number | null
          link_clicks?: number | null
          monthly_retainer?: number | null
          new_followers?: number | null
          period_date: string
          period_type?: string | null
          post_type?: string | null
          post_url?: string | null
          posts?: string | null
          revenue?: number | null
          settings_held?: number | null
          settings_planned?: number | null
          tenant_id: string
          words_spoken?: number | null
        }
        Update: {
          appointments?: number | null
          calls_interested?: number | null
          calls_made?: number | null
          calls_reached?: number | null
          cash_collected?: number | null
          closings?: number | null
          closings_held?: number | null
          closings_planned?: number | null
          cold_emails_replies?: number | null
          cold_emails_sent?: number | null
          comments?: number | null
          created_at?: string | null
          deal_volume?: number | null
          deals?: number | null
          dms_replies?: number | null
          dms_sent?: number | null
          followers_current?: number | null
          id?: number
          impressions?: number | null
          leads_qualified?: number | null
          leads_total?: number | null
          likes?: number | null
          link_clicks?: number | null
          monthly_retainer?: number | null
          new_followers?: number | null
          period_date?: string
          period_type?: string | null
          post_type?: string | null
          post_url?: string | null
          posts?: string | null
          revenue?: number | null
          settings_held?: number | null
          settings_planned?: number | null
          tenant_id?: string
          words_spoken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objections: {
        Row: {
          account_id: string | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          standard_response: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          standard_response: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          standard_response?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          avv_accepted_at: string | null
          calendar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_via: string | null
          is_super_admin: boolean
          linkedin_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone_number: string | null
          profile_image_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          avv_accepted_at?: string | null
          calendar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          invited_via?: string | null
          is_super_admin?: boolean
          linkedin_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          avv_accepted_at?: string | null
          calendar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_via?: string | null
          is_super_admin?: boolean
          linkedin_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_via_fkey"
            columns: ["invited_via"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          account_id: string
          created_at: string
          definition: Json
          description: string | null
          id: string
          name: string
          status: string
          total_completed: number
          total_leads: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          name: string
          status?: string
          total_completed?: number
          total_leads?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          name?: string
          status?: string
          total_completed?: number
          total_leads?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json
          avg_score: number | null
          created_at: string
          id: string
          nps: number | null
          review_clicked: string | null
          survey_id: string
          tags: string[] | null
          tenant_id: string
          testimonials: Json | null
          total_score: number | null
        }
        Insert: {
          answers?: Json
          avg_score?: number | null
          created_at?: string
          id?: string
          nps?: number | null
          review_clicked?: string | null
          survey_id: string
          tags?: string[] | null
          tenant_id: string
          testimonials?: Json | null
          total_score?: number | null
        }
        Update: {
          answers?: Json
          avg_score?: number | null
          created_at?: string
          id?: string
          nps?: number | null
          review_clicked?: string | null
          survey_id?: string
          tags?: string[] | null
          tenant_id?: string
          testimonials?: Json | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          account_id: string | null
          assignee_id: string
          created_at: string
          due_date: string | null
          id: string
          related_id: string | null
          related_type: Database["public"]["Enums"]["task_related_type"] | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assignee_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["task_related_type"] | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assignee_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["task_related_type"] | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          account_id: string
          created_at: string
          end_date: string | null
          goal_type: string
          goal_value: number
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          end_date?: string | null
          goal_type?: string
          goal_value?: number
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          end_date?: string | null
          goal_type?: string
          goal_value?: number
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_contact_progress: {
        Row: {
          account_id: string
          appointment_booked_at: string | null
          connection_accepted_at: string | null
          connection_sent_at: string | null
          contact_id: string
          created_at: string
          first_message_sent_at: string | null
          fu1_sent_at: string | null
          fu2_sent_at: string | null
          fu3_sent_at: string | null
          id: string
          positive_reply_at: string | null
          responded_at: string | null
          updated_at: string
          user_id: string
          workflow_status: string
        }
        Insert: {
          account_id: string
          appointment_booked_at?: string | null
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          contact_id: string
          created_at?: string
          first_message_sent_at?: string | null
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          id?: string
          positive_reply_at?: string | null
          responded_at?: string | null
          updated_at?: string
          user_id: string
          workflow_status?: string
        }
        Update: {
          account_id?: string
          appointment_booked_at?: string | null
          connection_accepted_at?: string | null
          connection_sent_at?: string | null
          contact_id?: string
          created_at?: string
          first_message_sent_at?: string | null
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          id?: string
          positive_reply_at?: string | null
          responded_at?: string | null
          updated_at?: string
          user_id?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_contact_progress_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_contact_progress_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_contact_progress_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_contact_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telephony_webhook_events: {
        Row: {
          account_id: string | null
          call_id: string | null
          created_at: string
          duration_seconds: number | null
          event_type: string
          from_number: string | null
          id: string
          processed: boolean | null
          provider: string
          raw_payload: Json | null
          recording_url: string | null
          status: string | null
          to_number: string | null
        }
        Insert: {
          account_id?: string | null
          call_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type: string
          from_number?: string | null
          id?: string
          processed?: boolean | null
          provider: string
          raw_payload?: Json | null
          recording_url?: string | null
          status?: string | null
          to_number?: string | null
        }
        Update: {
          account_id?: string | null
          call_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type?: string
          from_number?: string | null
          id?: string
          processed?: boolean | null
          provider?: string
          raw_payload?: Json | null
          recording_url?: string | null
          status?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_webhook_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ads_spend_monthly: number | null
          advisor_id: string | null
          aov_existing_customer: number | null
          aov_new_customer: number | null
          cac_actual: number | null
          cac_target: number | null
          closing_rate: number | null
          commission_rate_actual: number | null
          commission_rate_target: number | null
          company_name: string
          contact_name: string | null
          contract_duration: string | null
          cost_per_appointment: number | null
          cost_per_customer: number | null
          cost_per_customer_fulfillment: number | null
          cost_per_lead: number | null
          created_at: string | null
          current_conversion_rate: number | null
          current_leads_per_month: number | null
          current_offer: string | null
          current_revenue_monthly: number | null
          delivery_costs_monthly: number | null
          existing_customer_volume: number | null
          existing_customers: number | null
          fulfillment_gross_salary: number | null
          fulfillment_tool_costs: number | null
          goal_leads_monthly: number | null
          goal_revenue_monthly: number | null
          goal_timeframe: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          last_sync_at: string | null
          linkedin_experience: string | null
          linkedin_followers_current: number | null
          linkedin_url: string | null
          ltv_avg_customer: number | null
          margin_percent: number | null
          monthly_budget: number | null
          new_customer_volume: number | null
          new_customers_monthly: number | null
          offer_price: number | null
          onboarding_completed: boolean | null
          order_volume_monthly: number | null
          other_costs_monthly: number | null
          payment_default_rate: number | null
          personnel_costs_monthly: number | null
          posting_frequency: string | null
          primary_goal: string | null
          product_palette: Json | null
          revenue_onetime: number | null
          revenue_recurring: number | null
          sales_gross_salary: number | null
          sales_side_costs: number | null
          sheet_mapping: Json | null
          sheet_url: string | null
          target_audience: string | null
          team_size: string | null
          tools_costs_monthly: number | null
          total_customers: number | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          ads_spend_monthly?: number | null
          advisor_id?: string | null
          aov_existing_customer?: number | null
          aov_new_customer?: number | null
          cac_actual?: number | null
          cac_target?: number | null
          closing_rate?: number | null
          commission_rate_actual?: number | null
          commission_rate_target?: number | null
          company_name: string
          contact_name?: string | null
          contract_duration?: string | null
          cost_per_appointment?: number | null
          cost_per_customer?: number | null
          cost_per_customer_fulfillment?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          current_conversion_rate?: number | null
          current_leads_per_month?: number | null
          current_offer?: string | null
          current_revenue_monthly?: number | null
          delivery_costs_monthly?: number | null
          existing_customer_volume?: number | null
          existing_customers?: number | null
          fulfillment_gross_salary?: number | null
          fulfillment_tool_costs?: number | null
          goal_leads_monthly?: number | null
          goal_revenue_monthly?: number | null
          goal_timeframe?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          linkedin_experience?: string | null
          linkedin_followers_current?: number | null
          linkedin_url?: string | null
          ltv_avg_customer?: number | null
          margin_percent?: number | null
          monthly_budget?: number | null
          new_customer_volume?: number | null
          new_customers_monthly?: number | null
          offer_price?: number | null
          onboarding_completed?: boolean | null
          order_volume_monthly?: number | null
          other_costs_monthly?: number | null
          payment_default_rate?: number | null
          personnel_costs_monthly?: number | null
          posting_frequency?: string | null
          primary_goal?: string | null
          product_palette?: Json | null
          revenue_onetime?: number | null
          revenue_recurring?: number | null
          sales_gross_salary?: number | null
          sales_side_costs?: number | null
          sheet_mapping?: Json | null
          sheet_url?: string | null
          target_audience?: string | null
          team_size?: string | null
          tools_costs_monthly?: number | null
          total_customers?: number | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          ads_spend_monthly?: number | null
          advisor_id?: string | null
          aov_existing_customer?: number | null
          aov_new_customer?: number | null
          cac_actual?: number | null
          cac_target?: number | null
          closing_rate?: number | null
          commission_rate_actual?: number | null
          commission_rate_target?: number | null
          company_name?: string
          contact_name?: string | null
          contract_duration?: string | null
          cost_per_appointment?: number | null
          cost_per_customer?: number | null
          cost_per_customer_fulfillment?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          current_conversion_rate?: number | null
          current_leads_per_month?: number | null
          current_offer?: string | null
          current_revenue_monthly?: number | null
          delivery_costs_monthly?: number | null
          existing_customer_volume?: number | null
          existing_customers?: number | null
          fulfillment_gross_salary?: number | null
          fulfillment_tool_costs?: number | null
          goal_leads_monthly?: number | null
          goal_revenue_monthly?: number | null
          goal_timeframe?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          linkedin_experience?: string | null
          linkedin_followers_current?: number | null
          linkedin_url?: string | null
          ltv_avg_customer?: number | null
          margin_percent?: number | null
          monthly_budget?: number | null
          new_customer_volume?: number | null
          new_customers_monthly?: number | null
          offer_price?: number | null
          onboarding_completed?: boolean | null
          order_volume_monthly?: number | null
          other_costs_monthly?: number | null
          payment_default_rate?: number | null
          personnel_costs_monthly?: number | null
          posting_frequency?: string | null
          primary_goal?: string | null
          product_palette?: Json | null
          revenue_onetime?: number | null
          revenue_recurring?: number | null
          sales_gross_salary?: number | null
          sales_side_costs?: number | null
          sheet_mapping?: Json | null
          sheet_url?: string | null
          target_audience?: string | null
          team_size?: string | null
          tools_costs_monthly?: number | null
          total_customers?: number | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_log: {
        Row: {
          created_at: string
          endpoint_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_log_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cold_call_queue: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_activity_at: string | null
          last_name: string | null
          owner_user_id: string | null
          phone: string | null
          source: string | null
          stage: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_last_activity: {
        Row: {
          contact_id: string | null
          last_activity_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "cold_call_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_metrics_daily: {
        Row: {
          appointments: number | null
          calls_interested: number | null
          calls_made: number | null
          calls_reached: number | null
          cash_collected: number | null
          closing_rate: number | null
          closing_show_rate: number | null
          closings: number | null
          closings_held: number | null
          closings_planned: number | null
          comments: number | null
          comments_delta: number | null
          cost_per_lead: number | null
          cr_appt_to_deal: number | null
          cr_lead_to_appt: number | null
          cr_lead_to_deal: number | null
          created_at: string | null
          deal_volume: number | null
          deals: number | null
          dms_sent: number | null
          followers_current: number | null
          followers_delta: number | null
          id: number | null
          impressions: number | null
          impressions_delta: number | null
          interest_rate: number | null
          lead_quality_rate: number | null
          leads_per_closing: number | null
          leads_qualified: number | null
          leads_total: number | null
          likes: number | null
          likes_delta: number | null
          link_clicks: number | null
          monthly_retainer: number | null
          new_followers: number | null
          period_date: string | null
          period_type: string | null
          post_type: string | null
          post_url: string | null
          posts: string | null
          reach_rate: number | null
          revenue: number | null
          revenue_per_lead: number | null
          setting_show_rate: number | null
          settings_held: number | null
          settings_planned: number | null
          tenant_id: string | null
          words_spoken: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_metrics_monthly: {
        Row: {
          appointments: number | null
          calls_interested: number | null
          calls_made: number | null
          calls_reached: number | null
          cash_collected: number | null
          closing_rate: number | null
          closing_show_rate: number | null
          closings: number | null
          closings_held: number | null
          closings_planned: number | null
          comments: number | null
          cost_per_lead: number | null
          cr_appt_to_deal: number | null
          cr_lead_to_appt: number | null
          cr_lead_to_deal: number | null
          created_at: string | null
          deal_volume: number | null
          deals: number | null
          dms_sent: number | null
          followers_current: number | null
          impressions: number | null
          interest_rate: number | null
          lead_quality_rate: number | null
          leads_per_closing: number | null
          leads_qualified: number | null
          leads_total: number | null
          likes: number | null
          link_clicks: number | null
          monthly_retainer: number | null
          period_end: string | null
          period_start: string | null
          posts_count: number | null
          reach_rate: number | null
          revenue: number | null
          revenue_per_lead: number | null
          setting_show_rate: number | null
          settings_held: number | null
          settings_planned: number | null
          tenant_id: string | null
          words_spoken: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_metrics_weekly: {
        Row: {
          appointments: number | null
          calls_interested: number | null
          calls_made: number | null
          calls_reached: number | null
          cash_collected: number | null
          closing_rate: number | null
          closing_show_rate: number | null
          closings: number | null
          closings_held: number | null
          closings_planned: number | null
          comments: number | null
          cost_per_lead: number | null
          cr_appt_to_deal: number | null
          cr_lead_to_appt: number | null
          cr_lead_to_deal: number | null
          created_at: string | null
          deal_volume: number | null
          deals: number | null
          dms_sent: number | null
          followers_current: number | null
          impressions: number | null
          interest_rate: number | null
          lead_quality_rate: number | null
          leads_per_closing: number | null
          leads_qualified: number | null
          leads_total: number | null
          likes: number | null
          link_clicks: number | null
          monthly_retainer: number | null
          period_end: string | null
          period_start: string | null
          posts_count: number | null
          reach_rate: number | null
          revenue: number | null
          revenue_per_lead: number | null
          setting_show_rate: number | null
          settings_held: number | null
          settings_planned: number | null
          tenant_id: string | null
          words_spoken: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_metrics_yearly: {
        Row: {
          appointments: number | null
          calls_interested: number | null
          calls_made: number | null
          calls_reached: number | null
          cash_collected: number | null
          closing_rate: number | null
          closing_show_rate: number | null
          closings: number | null
          closings_held: number | null
          closings_planned: number | null
          comments: number | null
          cost_per_lead: number | null
          cr_appt_to_deal: number | null
          cr_lead_to_appt: number | null
          cr_lead_to_deal: number | null
          created_at: string | null
          deal_volume: number | null
          deals: number | null
          dms_sent: number | null
          followers_current: number | null
          impressions: number | null
          interest_rate: number | null
          lead_quality_rate: number | null
          leads_per_closing: number | null
          leads_qualified: number | null
          leads_total: number | null
          likes: number | null
          link_clicks: number | null
          monthly_retainer: number | null
          period_end: string | null
          period_start: string | null
          posts_count: number | null
          reach_rate: number | null
          revenue: number | null
          revenue_per_lead: number | null
          setting_show_rate: number | null
          settings_held: number | null
          settings_planned: number | null
          tenant_id: string | null
          words_spoken: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_lead_score: { Args: { p_contact_id: string }; Returns: number }
      contact_has_slug: { Args: { p_contact_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_contact_by_slug: {
        Args: { contact_slug: string }
        Returns: {
          company: string
          first_name: string
          id: string
          last_name: string
          pitch_video_url: string
          video_url: string
        }[]
      }
      get_enrichment_credits: {
        Args: { p_account_id: string }
        Returns: {
          account_id: string
          created_at: string
          email_credits_limit: number
          email_credits_used: number
          id: string
          month_year: string
          phone_credits_limit: number
          phone_credits_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "enrichment_credits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_followup_status: {
        Args: {
          p_first_message_sent_at: string
          p_fu1_sent_at: string
          p_fu2_sent_at: string
          p_viewed: boolean
          p_workflow_status: Database["public"]["Enums"]["linkedin_workflow_status"]
        }
        Returns: string
      }
      get_member_link_stats: {
        Args: { p_account_id: string; p_start_date?: string }
        Returns: {
          appointments_booked: number
          connections_accepted: number
          connections_sent: number
          messages_sent: number
          positive_replies: number
          replies: number
          total_leads: number
          user_id: string
        }[]
      }
      get_user_account_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_advisor: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_contact_last_activity: { Args: never; Returns: undefined }
      validate_api_key: {
        Args: { p_token: string }
        Returns: {
          key_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      activity_outcome:
        | "reached"
        | "no_answer"
        | "interested"
        | "not_interested"
      activity_type: "call" | "email" | "dm" | "meeting" | "note"
      app_role: "admin" | "client" | "advisor"
      benchmark_metric:
        | "calls_per_day"
        | "meetings_per_week"
        | "offers_per_week"
      deal_stage:
        | "New"
        | "Qualifiziert"
        | "Termin gesetzt"
        | "Angebot"
        | "Verhandlung"
        | "Gewonnen"
        | "Verloren"
        | "Lead"
        | "1\u00d7 nicht erreicht"
        | "2\u00d7 nicht erreicht"
        | "3\u00d7 nicht erreicht"
        | "Entscheider nicht erreichbar"
        | "Im Urlaub"
        | "Kein Interesse / Kein Bedarf"
        | "Termin gelegt"
        | "Setting terminiert"
        | "Setting No Show"
        | "Setting Follow Up"
        | "Closing terminiert"
        | "Closing No Show"
        | "Closing Follow Up"
        | "CC2 terminiert"
        | "Angebot versendet"
        | "Abgeschlossen"
        | "Hat Seite ge\u00f6ffnet"
        | "Hei\u00dfer Lead - Anrufen"
        | "Setting"
        | "Closing"
      lead_type: "inbound" | "outbound"
      linkedin_workflow_status:
        | "neu"
        | "bereit_fuer_vernetzung"
        | "vernetzung_ausstehend"
        | "vernetzung_angenommen"
        | "erstnachricht_gesendet"
        | "kein_klick_fu_offen"
        | "fu1_gesendet"
        | "fu2_gesendet"
        | "fu3_gesendet"
        | "reagiert_warm"
        | "abgeschlossen"
        | "positiv_geantwortet"
        | "termin_gebucht"
      outreach_status: "offen" | "gesendet" | "follow_up" | "geschlossen"
      task_related_type: "deal" | "contact"
      task_status: "open" | "done"
      telephony_provider:
        | "placetel"
        | "sipgate"
        | "aircall"
        | "twilio"
        | "telekom_nfon"
        | "other"
      user_role: "setter" | "closer" | "admin" | "standard" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_outcome: [
        "reached",
        "no_answer",
        "interested",
        "not_interested",
      ],
      activity_type: ["call", "email", "dm", "meeting", "note"],
      app_role: ["admin", "client", "advisor"],
      benchmark_metric: [
        "calls_per_day",
        "meetings_per_week",
        "offers_per_week",
      ],
      deal_stage: [
        "New",
        "Qualifiziert",
        "Termin gesetzt",
        "Angebot",
        "Verhandlung",
        "Gewonnen",
        "Verloren",
        "Lead",
        "1\u00d7 nicht erreicht",
        "2\u00d7 nicht erreicht",
        "3\u00d7 nicht erreicht",
        "Entscheider nicht erreichbar",
        "Im Urlaub",
        "Kein Interesse / Kein Bedarf",
        "Termin gelegt",
        "Setting terminiert",
        "Setting No Show",
        "Setting Follow Up",
        "Closing terminiert",
        "Closing No Show",
        "Closing Follow Up",
        "CC2 terminiert",
        "Angebot versendet",
        "Abgeschlossen",
        "Hat Seite ge\u00f6ffnet",
        "Hei\u00dfer Lead - Anrufen",
        "Setting",
        "Closing",
      ],
      lead_type: ["inbound", "outbound"],
      linkedin_workflow_status: [
        "neu",
        "bereit_fuer_vernetzung",
        "vernetzung_ausstehend",
        "vernetzung_angenommen",
        "erstnachricht_gesendet",
        "kein_klick_fu_offen",
        "fu1_gesendet",
        "fu2_gesendet",
        "fu3_gesendet",
        "reagiert_warm",
        "abgeschlossen",
        "positiv_geantwortet",
        "termin_gebucht",
      ],
      outreach_status: ["offen", "gesendet", "follow_up", "geschlossen"],
      task_related_type: ["deal", "contact"],
      task_status: ["open", "done"],
      telephony_provider: [
        "placetel",
        "sipgate",
        "aircall",
        "twilio",
        "telekom_nfon",
        "other",
      ],
      user_role: ["setter", "closer", "admin", "standard", "pro"],
    },
  },
} as const
