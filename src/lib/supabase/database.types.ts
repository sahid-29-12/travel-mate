export type Database = {
  public: {
    Tables: {
      traveler_profiles: {
        Row: {
          id: string;
          owner_id: string;
          full_name: string;
          phone: string | null;
          date_of_birth: string | null;
          gender: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          full_name: string;
          phone?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          date_of_birth: string | null;
          gender: string | null;
          address: string | null;
          avatar_url: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rides: {
        Row: {
          id: string;
          user_id: string;
          author_name: string;
          origin: string;
          destination: string;
          departure_at: string;
          seats_needed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          author_name: string;
          origin: string;
          destination: string;
          departure_at: string;
          seats_needed: number;
          created_at?: string;
        };
        Update: {
          origin?: string;
          destination?: string;
          departure_at?: string;
          seats_needed?: number;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          participant_one: string;
          participant_two: string;
          participant_one_name: string;
          participant_two_name: string;
          ride_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_one: string;
          participant_two: string;
          participant_one_name: string;
          participant_two_name: string;
          ride_id?: string | null;
          created_at?: string;
        };
        Update: {
          ride_id?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
