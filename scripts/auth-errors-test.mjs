import assert from 'node:assert/strict';
import {describeAuthError, AUTH_SERVICE_UNAVAILABLE} from '../src/lib/authErrors.ts';
assert.equal(describeAuthError({status:500,message:'private database details'}),AUTH_SERVICE_UNAVAILABLE);
assert.equal(describeAuthError({status:503}),AUTH_SERVICE_UNAVAILABLE);
assert.match(describeAuthError({status:429}),/wait a minute/);
assert.match(describeAuthError({code:'INVALID_EMAIL_OR_PASSWORD'}),/don't match/);
assert.match(describeAuthError({code:'USER_ALREADY_EXISTS'}),/Sign in instead/);
assert.doesNotMatch(describeAuthError({code:'UNKNOWN',message:'private database details'}),/private database/);
console.log('Auth error handling preserves useful validation and hides server details.');
