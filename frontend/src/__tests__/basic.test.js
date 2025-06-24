describe('Frontend Basic Tests', () => {
  test('should pass basic math test', () => {
    expect(2 + 2).toBe(4);
  });

  test('should test string operations', () => {
    const str = 'Hello Frontend';
    expect(str.toLowerCase()).toBe('hello frontend');
    expect(str.length).toBe(14);
  });

  test('should test object operations', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });
});
