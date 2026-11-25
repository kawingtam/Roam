type ReviewError={code?:string;status?:number;name?:string};
export function signInError(error:ReviewError):string{
 if(error.code==='invalid_credentials')return 'The email or password was not accepted. Use the password for your Roam account, which may differ from your Gmail or Supabase dashboard password.';
 if(error.code==='email_not_confirmed')return 'Confirm your Roam account email before signing in.';
 if(error.code==='over_request_rate_limit'||error.status===429)return 'Too many sign-in attempts. Wait a few minutes before trying again.';
 if(error.name==='AuthRetryableFetchError'||error.status===0)return 'Could not connect to Roam. Check your internet connection and open this page directly in your browser.';
 if((error.status||0)>=500)return 'Roam’s sign-in service is temporarily unavailable. Please try again shortly.';
 return 'Sign-in could not finish. Please try again. Your password has not been changed.';
}
export function requestsError(error:ReviewError):string{
 if(error.code==='42501')return 'This account is not authorized to review registrations.';
 if(error.code==='PGRST301'||error.status===401)return 'Your review session has expired. Please sign in again.';
 return 'Could not load registration requests. Your sign-in may have succeeded, but the review service could not be reached. Please try again.';
}
