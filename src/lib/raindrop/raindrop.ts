const raindrop = {
  create: (title: string = "default") => {
    console.log(`Creating a new raindrop ${title}`);
  },

  read: (id: number = 0) => {
    console.log(`Reading a raindrop with id: ${id}`);
  },

  edit: (id: number = 0, title: string = "default") => {
    console.log(`Edit an existing raindrop with id: ${id} and title: ${title}`);
  },

  rm: (id: number) => {
    console.log(`Removing a raindrop with id: ${id}`);
  },

  search: (id: number) => {
    console.log(`Removing a raindrop with id: ${id}`);
  }
};

export default raindrop;
