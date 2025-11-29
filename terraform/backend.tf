terraform {
  backend "s3" {
    bucket  = "devopsians-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

  }
}
