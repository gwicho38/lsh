class Lsh < Formula
  desc "Powerful, extensible shell with advanced job management and modern CLI features"
  homepage "https://github.com/gwicho38/lsh"
  url "https://registry.npmjs.org/gwicho38-lsh/-/gwicho38-lsh-0.3.4.tgz"
  sha256 "b2e733fc4228f85f8059bbb01d8c280238ca496791b4ee4e0f712e97506f6ce3"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", "-g", "--prefix=#{libexec}", "gwicho38-lsh@#{version}"
    bin.install_symlink "#{libexec}/bin/lsh"
  end

  test do
    assert_match "0.3.4", shell_output("#{bin}/lsh --version")
  end
end
