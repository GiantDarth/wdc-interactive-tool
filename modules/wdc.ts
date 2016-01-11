// Copyright (c) 2015 Christopher Robert Philabaum

export class Story {
    id: number;
    title: string;
    author: User;
    createdOn: Date;
    modifiedLast: Date;
    rating: Rating;
    genres: Genre[] = [];
    summary: string;
    description: string;
    url: string;
    posts: Post[];
}

export enum Rating {
    E, ASR, Teen, Adult, GC, XGC, NPL
}

export module Rating {
    export function parse(rating: string) {
        switch(rating) {
            case('E'):
                return Rating.E;
            case('ASR'):
                return Rating.ASR;
            case('13+'):
                return Rating.Teen;
            case('18+'):
                return Rating.Adult;
            case('GC'):
                return Rating.GC;
            case('XGC'):
                return Rating.XGC;
            case('NPL'):
                return Rating.NPL;
        }
    }
}

export enum Genre {
    Action_Adventure, Activity, Adult, Animal, Arts, Biographical, Business,
    Career, Childrens, Comedy, Community, Computers, Contest, Contest_Entry,
    Crime_Gangster, Cultural, Dark, Death, Detective, Drama, Educational,
    Emotional, Entertainment, Environment, Erotica, Experience, Family,
    Fanfiction, Fantasy, Fashion, Finance, Folklore, Food_Cooking, Foreign,
    Friendship, Gay_Lesbian, Genealogy, Ghost, Gothic, Health, History,
    Hobby_Craft, Holiday, Home_Garden, Horror_Scary, How_To_Advice,
    Inspirational, Internet_Web, Legal, Medical, Melodrama, Mens, Military,
    Music, Mystery, Mythology, Nature, News, Nonsense, Occult, Opinion,
    Paranormal, Parenting, Personal, Pets, Philosophy, Political,
    Psychology, Reference, Regional, Relationship, Religious, Research,
    Reviewing, Romance_Love, Satire, Sci_fi, Scientific, Self_Help,
    Spiritual, Sports, Steampunk, Supernatural, Technology, Teen,
    Thriller_Suspense, Tragedy, Transportation, Travel, Tribute, War,
    Western, Womens, Writing, Writing_Com, Young_Adult
}

export module Genre {
    export function parse(genre: string) {
        // Replace 's, -'s, whitespace, /'s, and .'s with '_',
        // then get the Genre value using the enum name, then cast to Genre.
        return <Genre>Genre[genre.replace(/(\/|-|\s|\.|\')/g, '_')];
    }
}

export class Post {
    id: number;
    title: string;
    author: User;
    text: string;
    // These can null, assuming the Post is the root.
    path: string;
    choiceTitle: string;
}

export interface User {
    name: string;
    user: string;
}
