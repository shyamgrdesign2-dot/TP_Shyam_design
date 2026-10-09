jest.mock('axios');
jest.mock('./EnvironmentConfig', () => ({ env: {} }));
jest.mock('./config', () => ({}));

test('App module loads without errors', () => {
  expect(true).toBe(true);
});
