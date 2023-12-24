const raindrop = {
    create: (title = "default") => {
        console.log(`Creating a new raindrop ${title}`);
    },
    read: (id = 0) => {
        console.log(`Reading a raindrop with id: ${id}`);
    },
    edit: (id = 0, title = "default") => {
        console.log(`Edit an existing raindrop with id: ${id} and title: ${title}`);
    },
    rm: (id) => {
        console.log(`Searching a raindrop with id: ${id}`);
    },
    search: (id) => {
        console.log(`Searching a raindrop with id: ${id}`);
    }
};
export default raindrop;
