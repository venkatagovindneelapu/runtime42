import { ExternalLink, Star, Download } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';

const templates = [
  {
    id: 1,
    title: 'SaaS Dashboard',
    description: 'Modern admin dashboard with charts, tables, and user management.',
    category: 'Dashboard',
    downloads: 2340,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
  },
  {
    id: 2,
    title: 'E-commerce Store',
    description: 'Complete online store with product listings, cart, and checkout.',
    category: 'E-commerce',
    downloads: 1890,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop',
  },
  {
    id: 3,
    title: 'Portfolio Website',
    description: 'Beautiful portfolio template for designers and developers.',
    category: 'Portfolio',
    downloads: 3120,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=250&fit=crop',
  },
  {
    id: 4,
    title: 'Blog Platform',
    description: 'Clean and minimal blog with rich text editor and comments.',
    category: 'Blog',
    downloads: 1560,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=250&fit=crop',
  },
  {
    id: 5,
    title: 'Landing Page',
    description: 'High-converting landing page with hero, features, and CTA sections.',
    category: 'Marketing',
    downloads: 4210,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
  },
  {
    id: 6,
    title: 'Social Network',
    description: 'Social media app with feeds, profiles, and messaging.',
    category: 'Social',
    downloads: 980,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=250&fit=crop',
  },
  {
    id: 7,
    title: 'CRM System',
    description: 'Customer relationship management with contacts and pipeline.',
    category: 'Business',
    downloads: 1340,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
  },
  {
    id: 8,
    title: 'Task Manager',
    description: 'Kanban-style task management with drag and drop.',
    category: 'Productivity',
    downloads: 2780,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=250&fit=crop',
  },
  {
    id: 9,
    title: 'AI Chatbot',
    description: 'Conversational AI interface with streaming responses.',
    category: 'AI',
    downloads: 1890,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
  },
];

const categories = ['All', 'Dashboard', 'E-commerce', 'Portfolio', 'Blog', 'Marketing', 'Social', 'Business', 'Productivity', 'AI'];

const Templates = () => {
  return (
    <DashboardShell>
          <div className="flex-1 overflow-y-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Templates</h1>
              <p className="text-muted-foreground">
                Start with a professionally designed template and customize it to your needs.
              </p>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === 'All'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={template.image}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                        {template.category}
                      </span>
                    </div>
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-medium">{template.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Download className="w-4 h-4" />
                          <span className="text-sm">{template.downloads.toLocaleString()}</span>
                        </div>
                      </div>
                      <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                        Use
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </DashboardShell>
  );
};

export default Templates;
