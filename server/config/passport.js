const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { supabase } = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email    = profile.emails[0].value.toLowerCase();
        const googleId = profile.id;

        // 1. Check if user already exists by googleId
        const { data: byGoogle } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', googleId)
          .maybeSingle();

        if (byGoogle) return done(null, byGoogle);

        // 2. Check if email exists (link Google to existing account)
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (byEmail) {
          const { data: updated } = await supabase
            .from('users')
            .update({ google_id: googleId, email_verified: true })
            .eq('id', byEmail.id)
            .select()
            .single();
          return done(null, updated);
        }

        // 3. Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            google_id:      googleId,
            email,
            shop_name:      profile.displayName || 'My Shop',
            email_verified: true,
            role:           'shop_owner',
          })
          .select()
          .single();

        if (error) return done(error, null);

        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;
