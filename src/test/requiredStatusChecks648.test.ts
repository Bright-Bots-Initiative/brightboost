// CONTROLLED SABOTAGE FOR #648.
//
// This disposable test must fail so we can verify that branch protection blocks
// merging when the required build-and-test check is red. Never merge this file.

describe("required status-check enforcement", () => {
  it("deliberately fails the controlled verification PR", () => {
    expect("red check").toBe("blocked merge");
  });
});
