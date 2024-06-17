// test_Fixture.js
// source: https://developer.c3.ai/docs/8.3.3/guide/guide-platform-ref/testing-jasmine

var filename = 'test_CheckTestRunner.js';
// Groups related test cases into a test suite. Everything inside this block is part of the test suite.
describe(filename, function () {
    let variable;
    // beforeAll runs once, before any of the tests in the describe block are run
    beforeAll(function () {
        C3.Pkg.setDevMode(true);
        // Create a TestApi context
        this.ctx = TestApi.createContext(filename);
        //  Wait for all asynchronous actions (if any) to complete
        TestApi.waitForSetup(this.ctx, null, 1, 120);
        variable = 0;
    });

    // beforeEach runs before each individual test
    beforeEach(function () {
        variable += 1;
    });

    // afterEach runs after each individual test
    afterEach(function () {
        expect(1).toEqual(1);
    });

    // afterAll runs once, after all tests in the describe block are finished
    afterAll(function () {
        //
        C3.Pkg.setDevMode(false);
        // Remove the objects tracked by context and any matched by teardown filters
        TestApi.teardown(this.ctx);
    });

    // Here's a test case
    it('should increment the variable by 1', function () {
        expect(variable).toEqual(1);
    });

    // Here's another test case
    it('should increment the variable again by 1', function () {
        expect(variable).toEqual(2);
    });
});
