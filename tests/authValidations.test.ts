import test from 'node:test';
import assert from 'node:assert/strict';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../src/lib/validations/auth';

test('auth schemas trim and normalize email addresses before submission', () => {
  assert.equal(
    loginSchema.parse({ email: '  User@Example.COM  ', password: 'secret' }).email,
    'user@example.com',
  );
  assert.equal(
    forgotPasswordSchema.parse({ email: ' User@Example.COM ' }).email,
    'user@example.com',
  );
});

test('registration keeps name and email in distinct validated fields', () => {
  const parsed = registerSchema.parse({
    name: '  Yasmanth  ',
    email: '  YasmanthClipping@GMAIL.COM ',
    password: 'CorrectHorse!9',
  });

  assert.equal(parsed.name, 'Yasmanth');
  assert.equal(parsed.email, 'yasmanthclipping@gmail.com');
});

test('registration rejects a password entered in the email field', () => {
  assert.equal(
    registerSchema.safeParse({
      name: 'yasmanthclipping@gmail.com',
      email: 'Yasmanth@123',
      password: 'CorrectHorse!9',
    }).success,
    false,
  );
});

test('registration and reset accept secure six-character passwords', () => {
  const password = 'Ab1!xy';

  assert.equal(registerSchema.safeParse({
    name: 'Test User',
    email: 'test@example.com',
    password,
  }).success, true);
  assert.equal(resetPasswordSchema.safeParse({
    newPassword: password,
    confirmPassword: password,
  }).success, true);
});

test('registration rejects passwords shorter than six characters or lacking variety', () => {
  assert.equal(registerSchema.safeParse({
    name: 'Test User',
    email: 'test@example.com',
    password: 'A1!xy',
  }).success, false);
  assert.equal(registerSchema.safeParse({
    name: 'Test User',
    email: 'test@example.com',
    password: 'abcdef',
  }).success, false);
});
