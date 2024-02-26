  // we use type() due to a C3 type system quirk https://community.c3.ai/t/how-to-call-a-static-function-from-an-instance-or-from-a-member-function-in-js-console/816
  summaryText += this.type().getPropertyDescriptorForSummary(self.id, self.name) + '\n';

