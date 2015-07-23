variable "app_name" { default = "gh-proxy" }

resource "heroku_app" "gh-proxy" {
    name   = "${var.app_name}"
    region = "us"

    config_vars {
	GITHUB_CLIENT_ID     = ""
	GITHUB_CLIENT_SECRET = ""
        BASEURL              = "https://${var.app_name}.herokuapp.com"
        COOKIE_SESSION_KEY   = ""
    }
}

