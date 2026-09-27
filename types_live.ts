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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_tutor_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_tutor_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campus: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          trust_score: number | null
          university: string | null
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          trust_score?: number | null
          university?: string | null
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          trust_score?: number | null
          university?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          contribution_type: string
          created_at: string
          id: string
          source_id: string | null
          source_table: string | null
          user_id: string
        }
        Insert: {
          contribution_type: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_table?: string | null
          user_id: string
        }
        Update: {
          contribution_type?: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_table?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          school_tag: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          school_tag?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          school_tag?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      errands: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          moderation_status: string
          reward: number | null
          school_tag: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          moderation_status?: string
          reward?: number | null
          school_tag?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          moderation_status?: string
          reward?: number | null
          school_tag?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hustles: {
        Row: {
          description: string | null
          id: string
          moderation_status: string
          poster_id: string | null
          price: number | null
          school_tag: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          moderation_status?: string
          poster_id?: string | null
          price?: number | null
          school_tag?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          moderation_status?: string
          poster_id?: string | null
          price?: number | null
          school_tag?: string | null
          title?: string | null
        }
        Relationships: []
      }
      lodges: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          description: string | null
          id: number
          images: string[]
          landlord_contact: string | null
          moderation_status: string
          name: string | null
          poster_id: string | null
          poster_name: string | null
          price: number | null
          school_tag: string | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: number
          images: string[]
          landlord_contact?: string | null
          moderation_status?: string
          name?: string | null
          poster_id?: string | null
          poster_name?: string | null
          price?: number | null
          school_tag?: string | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: number
          images?: string[]
          landlord_contact?: string | null
          moderation_status?: string
          name?: string | null
          poster_id?: string | null
          poster_name?: string | null
          price?: number | null
          school_tag?: string | null
        }
        Relationships: []
      }
      market: {
        Row: {
          description: string | null
          id: string
          image_url: string | null
          moderation_status: string
          poster_id: string | null
          price: number | null
          school_tag: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          image_url?: string | null
          moderation_status?: string
          poster_id?: string | null
          price?: number | null
          school_tag?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          image_url?: string | null
          moderation_status?: string
          poster_id?: string | null
          price?: number | null
          school_tag?: string | null
          title?: string | null
        }
        Relationships: []
      }
      message_requests: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          moderation_status: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          moderation_status?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          moderation_status?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "orbit_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "orbit_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_feed: {
        Row: {
          comments: Json | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          images: string[] | null
          likes: Json | null
          moderation_status: string
          poster_id: string | null
          poster_name: string | null
          school_tag: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          comments?: Json | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          images?: string[] | null
          likes?: Json | null
          moderation_status?: string
          poster_id?: string | null
          poster_name?: string | null
          school_tag: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          comments?: Json | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          images?: string[] | null
          likes?: Json | null
          moderation_status?: string
          poster_id?: string | null
          poster_name?: string | null
          school_tag?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      orbit_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "orbit_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_post_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_post_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "orbit_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "orbit_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          admin_note: string | null
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          department: string | null
          full_name: string | null
          id: string
          interests: string[] | null
          is_verified: boolean | null
          level: string | null
          onboarding_completed: boolean | null
          reputation_stars: number | null
          student_verified: boolean
          university: string | null
          wallet_balance: number | null
        }
        Insert: {
          account_status?: string
          admin_note?: string | null
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          department?: string | null
          full_name?: string | null
          id: string
          interests?: string[] | null
          is_verified?: boolean | null
          level?: string | null
          onboarding_completed?: boolean | null
          reputation_stars?: number | null
          student_verified?: boolean
          university?: string | null
          wallet_balance?: number | null
        }
        Update: {
          account_status?: string
          admin_note?: string | null
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean | null
          level?: string | null
          onboarding_completed?: boolean | null
          reputation_stars?: number | null
          student_verified?: boolean
          university?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          subscription: Json
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          subscription: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          subscription?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          points: number
          source_id: string | null
          source_table: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          points: number
          source_id?: string | null
          source_table?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          points?: number
          source_id?: string | null
          source_table?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
          verification_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          verification_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          verification_enabled?: boolean
        }
        Relationships: []
      }
      student_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_summary: Json
          file_name: string
          id: string
          imported_by: string | null
          inserted_rows: number
          rejected_rows: number
          school_id: string
          status: string
          total_rows: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_summary?: Json
          file_name: string
          id?: string
          imported_by?: string | null
          inserted_rows?: number
          rejected_rows?: number
          school_id: string
          status?: string
          total_rows?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_summary?: Json
          file_name?: string
          id?: string
          imported_by?: string | null
          inserted_rows?: number
          rejected_rows?: number
          school_id?: string
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_import_jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_registry: {
        Row: {
          created_at: string
          department: string | null
          faculty: string | null
          full_name: string
          full_name_normalized: string
          id: string
          level: string | null
          matric_number: string
          matric_number_normalized: string
          programme: string | null
          school_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          faculty?: string | null
          full_name: string
          full_name_normalized: string
          id?: string
          level?: string | null
          matric_number: string
          matric_number_normalized: string
          programme?: string | null
          school_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          faculty?: string | null
          full_name?: string
          full_name_normalized?: string
          id?: string
          level?: string | null
          matric_number?: string
          matric_number_normalized?: string
          programme?: string | null
          school_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_registry_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      study_bookmarks: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_course_enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_courses: {
        Row: {
          course_code: string
          course_title: string
          created_at: string
          department: string | null
          id: string
          level: string | null
          university: string
          updated_at: string
        }
        Insert: {
          course_code: string
          course_title: string
          created_at?: string
          department?: string | null
          id?: string
          level?: string | null
          university: string
          updated_at?: string
        }
        Update: {
          course_code?: string
          course_title?: string
          created_at?: string
          department?: string | null
          id?: string
          level?: string | null
          university?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_hub: {
        Row: {
          course_code: string | null
          file_url: string | null
          id: string
          material_type: string | null
          school_tag: string | null
        }
        Insert: {
          course_code?: string | null
          file_url?: string | null
          id?: string
          material_type?: string | null
          school_tag?: string | null
        }
        Update: {
          course_code?: string | null
          file_url?: string | null
          id?: string
          material_type?: string | null
          school_tag?: string | null
        }
        Relationships: []
      }
      study_progress: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          last_opened_at: string | null
          last_resource_id: string | null
          resources_opened: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_opened_at?: string | null
          last_resource_id?: string | null
          resources_opened?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_opened_at?: string | null
          last_resource_id?: string | null
          resources_opened?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_progress_last_resource_id_fkey"
            columns: ["last_resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_recent_activity: {
        Row: {
          id: string
          opened_at: string
          resource_id: string
          user_id: string
        }
        Insert: {
          id?: string
          opened_at?: string
          resource_id: string
          user_id: string
        }
        Update: {
          id?: string
          opened_at?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_recent_activity_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_resources: {
        Row: {
          academic_year: number | null
          category: string | null
          course_code: string | null
          course_id: string | null
          created_at: string
          department: string | null
          description: string | null
          download_count: number
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          level: string | null
          mime_type: string | null
          moderation_status: string
          original_filename: string | null
          resource_type: string
          semester: string | null
          storage_path: string | null
          title: string
          tribe_id: string | null
          university: string
          uploader_id: string
        }
        Insert: {
          academic_year?: number | null
          category?: string | null
          course_code?: string | null
          course_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          download_count?: number
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          level?: string | null
          mime_type?: string | null
          moderation_status?: string
          original_filename?: string | null
          resource_type?: string
          semester?: string | null
          storage_path?: string | null
          title: string
          tribe_id?: string | null
          university: string
          uploader_id: string
        }
        Update: {
          academic_year?: number | null
          category?: string | null
          course_code?: string | null
          course_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          download_count?: number
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          level?: string | null
          mime_type?: string | null
          moderation_status?: string
          original_filename?: string | null
          resource_type?: string
          semester?: string | null
          storage_path?: string | null
          title?: string
          tribe_id?: string | null
          university?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tribe_members: {
        Row: {
          joined_at: string
          role: string
          tribe_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          tribe_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          tribe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_members_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tribe_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          moderation_status: string
          tribe_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          moderation_status?: string
          tribe_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          moderation_status?: string
          tribe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_posts_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
        ]
      }
      tribes: {
        Row: {
          category: string | null
          course_code: string | null
          created_at: string
          creator_id: string | null
          department: string | null
          description: string | null
          id: string
          level: string | null
          moderation_status: string
          name: string
          university: string
        }
        Insert: {
          category?: string | null
          course_code?: string | null
          created_at?: string
          creator_id?: string | null
          department?: string | null
          description?: string | null
          id?: string
          level?: string | null
          moderation_status?: string
          name: string
          university: string
        }
        Update: {
          category?: string | null
          course_code?: string | null
          created_at?: string
          creator_id?: string | null
          department?: string | null
          description?: string | null
          id?: string
          level?: string | null
          moderation_status?: string
          name?: string
          university?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          agreed_to_terms: boolean | null
          email: string
          full_name: string | null
          id: number
          joined_at: string | null
          source: string | null
          university: string | null
          university_name: string | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          email: string
          full_name?: string | null
          id?: number
          joined_at?: string | null
          source?: string | null
          university?: string | null
          university_name?: string | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          email?: string
          full_name?: string | null
          id?: number
          joined_at?: string | null
          source?: string | null
          university?: string | null
          university_name?: string | null
        }
        Relationships: []
      }
      whisper_comments: {
        Row: {
          anon_label: string
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          moderation_status: string
          post_id: string
        }
        Insert: {
          anon_label: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          moderation_status?: string
          post_id: string
        }
        Update: {
          anon_label?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          moderation_status?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_identities: {
        Row: {
          anon_label: string
          created_at: string
          school_tag: string
          user_id: string
        }
        Insert: {
          anon_label: string
          created_at?: string
          school_tag: string
          user_id: string
        }
        Update: {
          anon_label?: string
          created_at?: string
          school_tag?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_posts: {
        Row: {
          anon_label: string
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          like_count: number
          moderation_status: string
          school_tag: string
        }
        Insert: {
          anon_label: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          like_count?: number
          moderation_status?: string
          school_tag: string
        }
        Update: {
          anon_label?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          like_count?: number
          moderation_status?: string
          school_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      whisper_comments_public: {
        Row: {
          anon_label: string | null
          content: string | null
          created_at: string | null
          id: string | null
          post_id: string | null
        }
        Insert: {
          anon_label?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          post_id?: string | null
        }
        Update: {
          anon_label?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whisper_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whisper_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_posts_public: {
        Row: {
          anon_label: string | null
          content: string | null
          created_at: string | null
          id: string | null
          like_count: number | null
        }
        Insert: {
          anon_label?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          like_count?: number | null
        }
        Update: {
          anon_label?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          like_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_action: {
        Args: { p_action: string; p_payload?: Json }
        Returns: Json
      }
      admin_bootstrap: { Args: never; Returns: Json }
      admin_emergency_lockdown: {
        Args: { p_enabled: boolean; p_reason?: string }
        Returns: Json
      }
      admin_get_audit_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          admin_id: string
          admin_name: string
          context: Json
          created_at: string
          result: string
          target_id: string
          target_type: string
        }[]
      }
      admin_get_content: {
        Args: { p_limit?: number; p_resource: string; p_search?: string }
        Returns: Json
      }
      admin_get_emergency_state: { Args: never; Returns: Json }
      admin_get_feature_flags: {
        Args: never
        Returns: {
          description: string
          enabled: boolean
          key: string
          name: string
        }[]
      }
      admin_get_live_activity: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
          result: string
        }[]
      }
      admin_get_overview: { Args: never; Returns: Json }
      admin_get_system_health: { Args: never; Returns: Json }
      admin_get_user: { Args: { p_user_id: string }; Returns: Json }
      admin_grant_console_member: { Args: { p_user_id: string }; Returns: Json }
      admin_list_content: { Args: { p_limit?: number }; Returns: Json }
      admin_list_reports: {
        Args: { p_limit?: number }
        Returns: {
          content_id: string
          content_preview: string
          content_type: string
          created_at: string
          id: string
          reason: string
          status: string
        }[]
      }
      admin_list_schools: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          name: string
          student_count: number
          tag: string
          verification_enabled: boolean
        }[]
      }
      admin_list_users: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          is_verified: boolean
          level: string
          school_tag: string
          university: string
        }[]
      }
      admin_moderate_content: {
        Args: {
          p_action: string
          p_id: string
          p_reason?: string
          p_resource: string
        }
        Returns: Json
      }
      admin_moderate_report: {
        Args: { p_action: string; p_report_id: string }
        Returns: Json
      }
      admin_prepare_student_import: {
        Args: { p_file_name: string; p_school_id: string; p_total_rows: number }
        Returns: string
      }
      admin_publish_announcement: {
        Args: { p_body: string; p_scope: string; p_title: string }
        Returns: Json
      }
      admin_set_campus_admin: {
        Args: { p_enabled: boolean; p_school_id: string; p_user_id: string }
        Returns: Json
      }
      admin_set_feature_flag: {
        Args: { p_enabled: boolean; p_key: string }
        Returns: Json
      }
      admin_set_user_restrictions: {
        Args: {
          p_can_marketplace: boolean
          p_can_message: boolean
          p_can_post: boolean
          p_can_upload: boolean
          p_can_use_whisper: boolean
          p_expires_at?: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_update_user:
        | { Args: { p_action: string; p_user_id: string }; Returns: Json }
        | {
            Args: { p_action: string; p_note?: string; p_user_id: string }
            Returns: Json
          }
      admin_upsert_school: {
        Args: {
          p_name: string
          p_rules?: string
          p_school_id: string
          p_tag: string
        }
        Returns: Json
      }
      award_reputation: {
        Args: {
          p_event_type: string
          p_points: number
          p_source_id?: string
          p_source_table?: string
          p_user_id: string
        }
        Returns: undefined
      }
      campus_chat_cancel_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      campus_chat_discover_students: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          bio: string
          department: string
          full_name: string
          id: string
          is_verified: boolean
          level: string
          university: string
        }[]
      }
      campus_chat_list_requests: {
        Args: never
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          recipient_avatar_url: string
          recipient_full_name: string
          recipient_id: string
          responded_at: string
          sender_avatar_url: string
          sender_department: string
          sender_full_name: string
          sender_id: string
          sender_level: string
          sender_university: string
          status: string
        }[]
      }
      campus_chat_respond_request: {
        Args: { p_action: string; p_request_id: string }
        Returns: string
      }
      campus_chat_search_students: {
        Args: { p_query?: string }
        Returns: {
          avatar_url: string
          bio: string
          department: string
          full_name: string
          id: string
          is_verified: boolean
          level: string
          reputation_stars: number
          university: string
        }[]
      }
      campus_chat_send_request: {
        Args: { p_message: string; p_recipient_id: string }
        Returns: {
          conversation_id: string | null
          created_at: string
          id: string
          message: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "message_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_student_verification_ticket: {
        Args: {
          p_email: string
          p_full_name: string
          p_matric_number: string
          p_school_id: string
          p_ticket: string
        }
        Returns: {
          department: string
          faculty: string
          level: string
          programme: string
          result_code: string
          school_id: string
          student_id: string
          valid: boolean
        }[]
      }
      consume_verification_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      consume_verification_rate_limit_for_user: {
        Args: {
          p_limit?: number
          p_school_id: string
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      create_student_verification_ticket: {
        Args: {
          p_email: string
          p_full_name: string
          p_matric_number: string
          p_school_id: string
        }
        Returns: {
          department: string
          expires_at: string
          faculty: string
          level: string
          programme: string
          result_code: string
          school_id: string
          student_id: string
          verification_ticket: string
          verified: boolean
        }[]
      }
      create_whisper: {
        Args: { p_content: string }
        Returns: {
          anon_label: string
          content: string
          created_at: string
          id: string
          like_count: number
        }[]
      }
      create_whisper_report: {
        Args: { p_content_id: string; p_reason: string }
        Returns: string
      }
      delete_whisper: { Args: { p_post_id: string }; Returns: boolean }
      get_my_whisper_state: {
        Args: { p_post_ids: string[] }
        Returns: {
          is_mine: boolean
          liked: boolean
          post_id: string
        }[]
      }
      get_or_create_whisper_identity: {
        Args: { p_school_tag: string }
        Returns: string
      }
      get_verification_schools: {
        Args: never
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_whisper_moderation_queue: {
        Args: { p_limit?: number }
        Returns: {
          anon_label: string
          author_id: string
          post_content: string
          post_created_at: string
          post_id: string
          reason: string
          report_created_at: string
          report_id: string
          report_status: string
          school_tag: string
        }[]
      }
      import_student_rows: {
        Args: { p_rows: Json; p_school_id: string }
        Returns: Json
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_student_registry_admin: { Args: never; Returns: boolean }
      is_whisper_moderator: { Args: never; Returns: boolean }
      issue_student_verification_ticket: {
        Args: {
          p_department: string
          p_email: string
          p_faculty: string
          p_full_name: string
          p_level: string
          p_matric_number: string
          p_programme: string
          p_school_id: string
          p_student_id: string
          p_token: string
        }
        Returns: boolean
      }
      orbit_create_report: {
        Args: { p_content_id: string; p_content_type: string; p_reason: string }
        Returns: string
      }
      orbit_current_campus: { Args: never; Returns: string }
      platform_status: { Args: never; Returns: Json }
      review_whisper_report: {
        Args: { p_action: string; p_report_id: string }
        Returns: boolean
      }
      study_current_university: { Args: never; Returns: string }
      study_increment_download: {
        Args: { p_resource_id: string }
        Returns: undefined
      }
      study_record_resource_open: {
        Args: { p_resource_id: string }
        Returns: undefined
      }
      toggle_whisper_like: { Args: { p_post_id: string }; Returns: Json }
      universeicos_create_notification:
        | {
            Args: {
              p_actor_id: string
              p_body: string
              p_link?: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_actor_id?: string
              p_body: string
              p_link?: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: string
          }
      verify_student_identity: {
        Args: {
          p_full_name: string
          p_matric_number: string
          p_school_id: string
        }
        Returns: {
          department: string
          faculty: string
          level: string
          programme: string
          result_code: string
          school_id: string
          student_id: string
          verified: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
