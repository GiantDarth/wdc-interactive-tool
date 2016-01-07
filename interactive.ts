module Interactive {
    export class Story {
        id: number;
        name: string;
        author: User;
        createdOn: Date;
        modifiedLast: Date;
        rating: Rating;
        genres: Genre[];
        summary: string;
        description: string;
        url: string;
        posts: Post[];
    }

    export interface StoryFile {
        id: number;
        name: string;
        author: User;
        createdOn?: Date;
        modifiedLast?: Date;
        rating: Rating;
        genres: Genre[];
        summary: string;
        description: string;
        url: string;
        posts: PostFile[];
    }

    enum Rating {
        E
    }

    enum Genre {
        Entertainment,
        Inspirational
    }

    interface Post {
        id: number;
        title: string;
        author: User;
        parent?: Post;
        choiceTitle?: string;
        choices?: Post[];
        text: string;
    }

    interface PostFile {
        id: number;
        title: string;
        author: User;
        parent?: number;
        choiceTitle?: string;
        choices?: number[];
        text: string;
    }

    interface User {
        name: string;
        user: string;
    }
}
