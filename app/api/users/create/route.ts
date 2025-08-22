import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      phone,
      address,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      medical_conditions,
      allergies,
    } = await request.json()

    console.log("[v0] Creating user with admin client:", { email, role })

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
      },
    })

    if (authError) {
      console.error("[v0] Auth user creation failed:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Auth user created successfully:", authUser.user.id)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        role,
        phone,
        address,
        date_of_birth,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
      })
      .select()
      .single()

    if (profileError) {
      console.error("[v0] Profile creation failed:", profileError)
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log("[v0] User profile created successfully")
    return NextResponse.json({ user: profile })
  } catch (error) {
    console.error("[v0] User creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
