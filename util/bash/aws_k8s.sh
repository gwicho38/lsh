#!/usr/bin/env bash

function test_cornea() {
    aws eks --region us-east-1 update-kubeconfig --name corneaicmptest2-kube-01
    aws eks update-kubeconfig --name corneaicmptest2-kube-01 --role-arn arn:aws:iam::841293427129:role/dev-eksops1-setup-01
}