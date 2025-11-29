variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1" # Change to your preferred region
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "devopsians"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
