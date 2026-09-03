// Public, read-only GitHub repositories displayed by Learning Notes.
// Do not add GitHub tokens here: everything in frontend code is public.
export const NOTE_REPOSITORIES = [
  {
    id: 'senior-system-engineer',
    owner: 'lekhrajdinkar',
    repo: 'senior-system-engineer',
    localRepo: 'solution-engineer',
    branch: '2026',
    path: 'docs',
    name: 'Senior System Engineer',
    description: 'Architecture, cloud, DevOps, and senior engineering notes.',
    repositoryStyle: ['#0891b2', '#6366f1'],
  },
  {
    id: 'ai-engineer',
    owner: 'lekhrajdinkar',
    repo: 'AI-Engineer',
    localRepo: 'genai',
    branch: '2026',
    path: 'docs',
    name: 'AI Engineer',
    description: 'Generative AI, agents, RAG, protocols, and AI engineering notes.',
    repositoryStyle: ['#0891b2', '#6366f1'],
  },
  {
    id: 'microservice-python',
    owner: 'lekhrajdinkar',
    repo: 'microservice-python',
    localRepo: 'microservice-python',
    branch: '2026',
    path: 'docs',
    name: 'Microservice Python',
    description: 'Python and Python microservice engineering notes.',
    repositoryStyle: ['#0284c7', '#eab308'],
  },

  {
    id: 'microservice-java',
    owner: 'lekhrajdinkar',
    repo: 'microservice-java',
    localRepo: 'microservice-java',
    branch: 'main',
    path: 'docs',
    name: 'Microservice Java',
    description: 'Java, Spring, and microservice engineering notes.',
    repositoryStyle: ['#ea580c', '#ef4444'],
  },

  {
    id: 'data-engineer',
    owner: 'lekhrajdinkar',
    repo: 'data-engineer',
    branch: 'main',
    path: 'docs',
    name: 'Data Engineer',
    description: 'Data engineering, ETL, and data pipeline notes.',
    repositoryStyle: ['#059669', '#10b981'],
  },


  {
    id: 'cloud-engineering',
    owner: 'Manisha-sharda-Prasad',
    repo: 'cloud-engineering',
    branch: 'main',
    path: 'doc',
    name: 'Cloud Engineering',
    description: 'AWS, cloud foundations, and cloud engineering notes.',
    repositoryStyle: ['#2563eb', '#06b6d4'],
  },
  {
    id: 'blog-posts',
    owner: 'nitinkc',
    repo: 'nitinkc.github.io',
    branch: 'main',
    path: '_posts',
    name: 'NitinKCBlog Posts',
    description: 'NitinKC blog posts and articles.',
    repositoryStyle: ['#d97706', '#f59e0b'],
  }
]

export const NOTE_INDEX_CACHE_MS = 5 * 60 * 1000

