module "vpc" {
  source = "./modules/vpc"

  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr            = "10.0.0.0/16"
  availability_zones  = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]

  tags = {
    Course = "DEPI-DevOps"
  }
}

module "eks" {
  source = "./modules/eks"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.public_subnet_ids

  cluster_version = "1.31"
  endpoint_public_access    = true
  endpoint_private_access   = false
  enabled_cluster_log_types = ["api", "audit"]

  tags = {
    Course = "DEPI-DevOps"
  }

  depends_on = [module.vpc]
}

module "node_group" {
  source = "./modules/node-group"

  project_name = var.project_name
  environment  = var.environment
  cluster_name = module.eks.cluster_name
  subnet_ids   = module.vpc.public_subnet_ids

  desired_size   = 2
  min_size       = 2
  max_size       = 3
  instance_types = ["t3.small"]
  capacity_type  = "ON_DEMAND"
  disk_size      = 20

  tags = {
    Course = "DEPI-DevOps"
  }

  depends_on = [module.eks]
}
