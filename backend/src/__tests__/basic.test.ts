describe('Backend Basic Tests', () => {
  test('should pass basic math test', () => {
    expect(2 + 2).toBe(4);
  });

  test('should test string operations', () => {
    const str = 'Hello Backend';
    expect(str.toLowerCase()).toBe('hello backend');
    expect(str.length).toBe(13);
  });

  test('should test array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });
});
