variable "heroku_email" {}
variable "heroku_api_key" {}

provider "heroku" {
    email   = "${var.heroku_email}"
    api_key = "${var.heroku_api_key}"
}
