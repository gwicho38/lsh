def inst(func):
    def inst_wrapper():
        if __name__ == "__main__":
            func()
    return inst_wrapper()